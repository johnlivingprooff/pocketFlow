import { exec, execRun, getDb } from './index';
import { Wallet } from '../../types/wallet';
import { invalidateWalletCaches } from '../cache/queryCache';
import { error as logError, log } from '../../utils/logger';

export async function createWallet(w: Wallet) {
  const startTime = Date.now();
  try {
    const params = [
      w.name,
      w.currency,
      w.initial_balance ?? 0,
      w.type,
      w.color ?? null,
      (w as any).description ?? null,
      new Date().toISOString(),
      w.is_primary ?? 0,
      w.exchange_rate ?? 1.0,
    ];
    
    await execRun(
      `INSERT INTO wallets (name, currency, initial_balance, type, color, description, created_at, is_primary, exchange_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      params
    );
    
    const writeTime = Date.now() - startTime;
    log(`[DB] Wallet created in ${writeTime}ms, name: ${w.name}, currency: ${w.currency}, timestamp: ${new Date().toISOString()}`);
    
    // Invalidate wallet caches after creation
    invalidateWalletCaches();
  } catch (err: any) {
    const writeTime = Date.now() - startTime;
    logError(`[DB] Failed to create wallet after ${writeTime}ms:`, err);
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
  if (w.is_primary !== undefined) set('is_primary', w.is_primary);
  if (w.exchange_rate !== undefined) set('exchange_rate', w.exchange_rate);
    if (w.display_order !== undefined) set('display_order', w.display_order);
  params.push(id);
  await execRun(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ?;`, params);
  
  // Invalidate wallet caches after update
  invalidateWalletCaches();
}

export async function deleteWallet(id: number) {
  await execRun('DELETE FROM wallets WHERE id = ?;', [id]);
  
  // Invalidate wallet caches after deletion
  invalidateWalletCaches();
}

export async function getWallets(): Promise<Wallet[]> {
  return exec<Wallet>('SELECT * FROM wallets ORDER BY display_order ASC, created_at DESC;');
}

/**
 * Update the display order of multiple wallets at once
 * @param orderUpdates - Array of {id, display_order} objects
 */
export async function updateWalletsOrder(orderUpdates: Array<{ id: number; display_order: number }>): Promise<void> {
  const database = await getDb();
  
  // Use a transaction to batch all updates for better performance
  await database.withTransactionAsync(async () => {
    const statement = await database.prepareAsync('UPDATE wallets SET display_order = ? WHERE id = ?;');
    
    try {
      for (const update of orderUpdates) {
        await statement.executeAsync([update.display_order, update.id]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function getWallet(id: number): Promise<Wallet[]> {
  return exec<Wallet>('SELECT * FROM wallets WHERE id = ?;', [id]);
}

export async function setPrimaryWallet(id: number) {
  await execRun('UPDATE wallets SET is_primary = 0;');
  await execRun('UPDATE wallets SET is_primary = 1 WHERE id = ?;', [id]);
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

  const database = await getDb();
  
  // Get all wallet initial balances
  // Note: We're using string interpolation for placeholders, but the actual values
  // come from the walletIds parameter array, making this safe from SQL injection
  const placeholders = walletIds.map(() => '?').join(',');
  const wallets = await database.getAllAsync<{ id: number; initial_balance: number }>(
    `SELECT id, initial_balance FROM wallets WHERE id IN (${placeholders});`,
    walletIds
  );
  
  // Get all transaction sums grouped by wallet_id and type in a single query
  const transactionSums = await database.getAllAsync<{ wallet_id: number; type: string; total: number }>(
    `SELECT wallet_id, type, COALESCE(SUM(amount), 0) as total 
     FROM transactions 
     WHERE wallet_id IN (${placeholders})
     GROUP BY wallet_id, type;`,
    walletIds
  );
  
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
