import { exec, execRun, getDbAsync } from './index';
import { Wallet } from '../../types/wallet';
import { invalidateWalletCaches } from '../cache/queryCache';
import { error as logError, log, generateOperationId, metrics, warn } from '../../utils/logger';
import { detectJSEngine, toSafeInteger, isSafeInteger } from '../../utils/platform';
import { enqueueWrite } from './writeQueue';

// Idempotency tracking for wallet reorder operations
// Prevents duplicate reorders within a short time window
// NOTE: This is a simple in-memory cache suitable for single-user mobile app
// The entire order (as comma-separated IDs) is used as the hash, so different
// orderings of the same wallets are correctly treated as different operations
const recentReorders = new Map<string, number>();
const REORDER_IDEMPOTENCY_WINDOW_MS = 2000; // 2 seconds

/**
 * Generate a hash of the wallet order for idempotency checking
 * Uses the complete ordered sequence of wallet IDs to uniquely identify each reorder operation
 */
function hashWalletOrder(orderUpdates: Array<{ id: number; display_order: number }>): string {
  // Sort by display_order to get the intended final order, then join IDs
  // This ensures [A,B,C] and [C,B,A] produce different hashes
  return orderUpdates
    .slice() // Create copy to avoid mutating input
    .sort((a, b) => a.display_order - b.display_order)
    .map(u => u.id)
    .join(',');
}

/**
 * Check if a reorder operation is a duplicate within the idempotency window
 * 
 * NOTE: This implementation uses an in-memory Map which is suitable for
 * a single-user mobile app context. In React Native, JavaScript runs on a
 * single thread, so Map operations are effectively atomic. For server-side
 * or multi-threaded environments, proper synchronization would be needed.
 */
function isDuplicateReorder(orderUpdates: Array<{ id: number; display_order: number }>): boolean {
  const orderHash = hashWalletOrder(orderUpdates);
  const lastReorderTime = recentReorders.get(orderHash);
  const now = Date.now();
  
  if (lastReorderTime && (now - lastReorderTime) < REORDER_IDEMPOTENCY_WINDOW_MS) {
    return true;
  }
  
  // Update the last reorder time
  recentReorders.set(orderHash, now);
  
  // Clean up old entries to prevent memory leak
  if (recentReorders.size > 100) {
    const cutoffTime = now - REORDER_IDEMPOTENCY_WINDOW_MS;
    for (const [hash, time] of recentReorders.entries()) {
      if (time < cutoffTime) {
        recentReorders.delete(hash);
      }
    }
  }
  
  return false;
}

export async function createWallet(w: Wallet) {
  const operationId = generateOperationId();
  const startTime = Date.now();
  
  try {
    log('[DB] Creating wallet', { name: w.name, currency: w.currency, operationId }, operationId);
    metrics.increment('db.wallet.create.total');
    
    // Get the count of existing wallets to set display_order
    const existingWallets = await exec<{ count: number }>('SELECT COUNT(*) as count FROM wallets;');
    const rawCount = existingWallets[0]?.count ?? 0;
    
    // RELEASE-BUILD FIX: Ensure display_order is a safe integer
    // In Hermes, number handling can differ from JSC, and SQLite expects INTEGER type
    const nextDisplayOrder = toSafeInteger(rawCount);
    
    // RELEASE DEBUG: Log type information for debugging
    if (!__DEV__) {
      console.log('[RELEASE_DEBUG] createWallet display_order:', {
        rawCount,
        nextDisplayOrder,
        isInteger: Number.isInteger(nextDisplayOrder),
        isSafe: isSafeInteger(nextDisplayOrder),
        jsEngine: detectJSEngine(),
        operationId,
      });
    }
    
    const params = [
      w.name,
      w.currency,
      w.initial_balance ?? 0,
      w.type,
      w.color ?? null,
      w.description ?? null,
      new Date().toISOString(),
      w.is_primary ?? 0,
      w.exchange_rate ?? 1.0,
      nextDisplayOrder, // Ensure new wallet gets sequential display_order
    ];
    
    await enqueueWrite(async () => {
      await execRun(
        `INSERT INTO wallets (name, currency, initial_balance, type, color, description, created_at, is_primary, exchange_rate, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        params
      );
    }, 'createWallet');
    
    const writeTime = Date.now() - startTime;
    log('[DB] Wallet created successfully', { 
      name: w.name, 
      currency: w.currency, 
      duration: writeTime,
      display_order: nextDisplayOrder,
      operationId 
    }, operationId);
    
    metrics.increment('db.wallet.create.success');
    
    // Invalidate wallet caches after creation
    invalidateWalletCaches();
  } catch (err: any) {
    const writeTime = Date.now() - startTime;
    logError('[DB] Failed to create wallet', { 
      error: err.message, 
      duration: writeTime,
      operationId 
    }, operationId);
    
    metrics.increment('db.wallet.create.error');
    throw err; // Re-throw to allow UI to handle it
  }
}

export async function updateWallet(id: number, w: Partial<Wallet>) {
  const fields: string[] = [];
  const params: any[] = [];
  const set = (k: string, v: any) => {
    fields.push(`${k} = ?`);
    params.push(v);
  };
  if (w.name !== undefined) set('name', w.name);
  if (w.currency !== undefined) set('currency', w.currency);
  if (w.initial_balance !== undefined) set('initial_balance', w.initial_balance);
  if (w.type !== undefined) set('type', w.type);
  if (w.color !== undefined) set('color', w.color);
  if (w.description !== undefined) set('description', w.description);
  if (w.is_primary !== undefined) set('is_primary', w.is_primary);
  if (w.exchange_rate !== undefined) set('exchange_rate', w.exchange_rate);
  if (w.display_order !== undefined) set('display_order', w.display_order);
  if ((w as any).accountType !== undefined) set('accountType', (w as any).accountType);
  if ((w as any).accountNumber !== undefined) set('accountNumber', (w as any).accountNumber);
  if ((w as any).phoneNumber !== undefined) set('phoneNumber', (w as any).phoneNumber);
  if ((w as any).serviceProvider !== undefined) set('serviceProvider', (w as any).serviceProvider);
  params.push(id);
  await enqueueWrite(async () => {
    await execRun(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ?;`, params);
  }, 'updateWallet');
  
  // Invalidate wallet caches after update
  invalidateWalletCaches();
}

export async function deleteWallet(id: number) {
  await enqueueWrite(async () => {
    await execRun('DELETE FROM wallets WHERE id = ?;', [id]);
  }, 'deleteWallet');
  
  // Invalidate wallet caches after deletion
  invalidateWalletCaches();
}

export async function getWallets(): Promise<Wallet[]> {
  // Order ONLY by display_order to ensure consistent position-based sorting
  // This prevents display_order=0 wallets from being re-sorted by created_at
  return exec<Wallet>('SELECT * FROM wallets ORDER BY display_order ASC;');
}

/**
 * Update the display order of multiple wallets at once
 * Ensures display_order values are always sequential (0, 1, 2, ...)
 * Includes idempotency protection to prevent duplicate reorders within 2 seconds
 * RELEASE-BUILD HARDENED: Adds explicit integer coercion and detailed logging
 * @param orderUpdates - Array of {id, display_order} objects (display_order values are ignored and forced sequential)
 */
export async function updateWalletsOrder(orderUpdates: Array<{ id: number; display_order: number }>): Promise<void> {
  const operationId = generateOperationId();
  const startTime = Date.now();
  
  // RELEASE DEBUG: Log input state for debugging release-specific issues
  if (!__DEV__) {
    console.log('[RELEASE_DEBUG] updateWalletsOrder input:', {
      operationId,
      updateCount: orderUpdates.length,
      updates: orderUpdates,
      jsEngine: detectJSEngine(),
      timestamp: new Date().toISOString(),
    });
  }
  
  // Idempotency check: prevent duplicate reorder operations within short time window
  if (isDuplicateReorder(orderUpdates)) {
    warn('[DB] Duplicate wallet reorder detected within idempotency window', { 
      walletCount: orderUpdates.length,
      operationId 
    }, operationId);
    
    metrics.increment('db.wallet.reorder.duplicate');
    return; // Skip duplicate operation
  }
  
  // Nitro SQLite: Direct atomic reorder (no write queue needed)
  const database = await getDbAsync();
  try {
    log('[DB] Updating wallet order', { 
      walletCount: orderUpdates.length, 
      operationId 
    }, operationId);
    metrics.increment('db.wallet.reorder.total');
    await database.transaction(async (tx) => {
      for (let i = 0; i < orderUpdates.length; i++) {
        const walletId = toSafeInteger(orderUpdates[i].id);
        const displayOrder = toSafeInteger(i);
        if (!__DEV__ && i < 3) {
          console.log('[RELEASE_DEBUG] Updating wallet:', {
            walletId,
            displayOrder,
            isIdInteger: Number.isInteger(walletId),
            isOrderInteger: Number.isInteger(displayOrder),
          });
        }
        await tx.executeAsync('UPDATE wallets SET display_order = ? WHERE id = ?;', [displayOrder, walletId]);
      }
    });
    const duration = Date.now() - startTime;
    log('[DB] Wallet order updated successfully', { 
      walletCount: orderUpdates.length, 
      duration,
      operationId 
    }, operationId);
    if (!__DEV__) {
      const finalWallets = await exec<{ id: number; display_order: number }>(
        'SELECT id, display_order FROM wallets ORDER BY display_order ASC LIMIT 5;'
      );
      console.log('[RELEASE_DEBUG] Post-reorder wallet state:', {
        first5Wallets: finalWallets,
        operationId,
      });
    }
    metrics.increment('db.wallet.reorder.success');
    invalidateWalletCaches();
  } catch (err: any) {
    const duration = Date.now() - startTime;
    if (!__DEV__) {
      console.error('[RELEASE_DEBUG] Reorder error details:', {
        error: err.message,
        stack: err.stack,
        errorCode: err.code,
        walletCount: orderUpdates.length,
        operationId,
        jsEngine: detectJSEngine(),
      });
    }
    logError('[DB] Failed to update wallet order', { 
      error: err.message, 
      walletCount: orderUpdates.length,
      duration,
      operationId 
    }, operationId);
    metrics.increment('db.wallet.reorder.error');
    throw err;
  }
}

export async function getWallet(id: number): Promise<Wallet[]> {
  return exec<Wallet>('SELECT * FROM wallets WHERE id = ?;', [id]);
}

export async function setPrimaryWallet(id: number) {
  // ✅ FIX: Wrap in enqueueWrite and transaction to ensure atomic operation
  // Prevents case where app crashes between the two UPDATEs, leaving both wallets non-primary
  return enqueueWrite(async () => {
    const database = await getDbAsync();
    
    await database.transaction(async (tx) => {
      await tx.executeAsync('UPDATE wallets SET is_primary = 0;');
      await tx.executeAsync('UPDATE wallets SET is_primary = 1 WHERE id = ?;', [id]);
    });
    
    invalidateWalletCaches();
  }, 'set_primary_wallet');
}

export async function getWalletBalance(id: number): Promise<number> {
  const income = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = 'income';`,
    [id]
  );
  const expense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = 'expense';`,
    [id]
  );
  const w = await getWallet(id);
  const initial = w[0]?.initial_balance ?? 0;
  // Expenses are stored as negative, so we add them (they're already negative)
  return initial + (income[0]?.total ?? 0) + (expense[0]?.total ?? 0);
}

/**
 * Get balances for multiple wallets efficiently in a single query
 * This avoids N+1 query problems when fetching all wallet balances
 * @param walletIds - Array of wallet IDs to fetch balances for
 * @returns Record mapping wallet ID to balance
 */
export async function getWalletBalances(walletIds: number[]): Promise<Record<number, number>> {
  if (walletIds.length === 0) {
    return {};
  }

  const database = await getDbAsync();
  
  // Get all wallet initial balances
  // Note: We're using string interpolation for placeholders, but the actual values
  // come from the walletIds parameter array, making this safe from SQL injection
  const placeholders = walletIds.map(() => '?').join(',');
  const walletsResult = await database.executeAsync(
    `SELECT id, initial_balance FROM wallets WHERE id IN (${placeholders});`,
    walletIds
  );
  const wallets = walletsResult.rows?._array || [];
  
  // Get all transaction sums grouped by wallet_id and type in a single query
  const transactionSumsResult = await database.executeAsync(
    `SELECT wallet_id, type, COALESCE(SUM(amount), 0) as total 
     FROM transactions 
     WHERE wallet_id IN (${placeholders})
     GROUP BY wallet_id, type;`,
    walletIds
  );
  const transactionSums = transactionSumsResult.rows?._array || [];
  
  // Build the result map
  const balances: Record<number, number> = {};
  
  // Initialize with initial balances
  for (const wallet of wallets) {
    balances[wallet.id] = wallet.initial_balance ?? 0;
  }
  
  // Add transaction sums (expenses are already negative)
  for (const sum of transactionSums) {
    balances[sum.wallet_id] = (balances[sum.wallet_id] ?? 0) + sum.total;
  }
  
  return balances;
}

/**
 * Get wallet balance converted to default currency using exchange rate
 * @param id - Wallet ID
 * @param defaultCurrency - Default currency (optional, for validation)
 */
export async function getWalletBalanceInDefaultCurrency(id: number, defaultCurrency?: string): Promise<number> {
  const balance = await getWalletBalance(id);
  const w = await getWallet(id);
  const wallet = w[0];
  
  if (!wallet) return 0;
  
  // If wallet currency matches default or no exchange rate set, return as-is
  const exchangeRate = wallet.exchange_rate ?? 1.0;
  
  // Convert: balance * exchange_rate
  return balance * exchangeRate;
}
