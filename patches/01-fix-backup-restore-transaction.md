# CRITICAL PATCH 1: Fix Backup Restore Transaction Atomicity

## File: src/lib/export/backupRestore.ts

## Issue
Restore operation uses sequential exec() calls without transaction wrapper.
Partial failure leaves database in inconsistent state.

## Changes

Replace the `restoreFromBackup` function (lines 105-179) with:

```typescript
/**
 * Restores data from a backup file
 * FIXED: Wrapped in database transaction for atomicity
 */
export async function restoreFromBackup(backupUri: string): Promise<{ success: boolean; error?: string }> {
  try {
    const content = await FileSystem.readAsStringAsync(backupUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const backupData: BackupData = JSON.parse(content);

    if (!backupData.data || !backupData.data.wallets || !backupData.data.transactions) {
      throw new Error('Invalid backup file format');
    }

    // ✅ FIX: Import getDb and wrap entire operation in transaction
    const { getDb } = await import('../db');
    const database = await getDb();
    
    await database.withTransactionAsync(async () => {
      // Clear existing data
      await database.execAsync('DELETE FROM transactions;');
      await database.execAsync('DELETE FROM wallets;');
      await database.execAsync('DELETE FROM categories;');
      
      // Reset autoincrement counters
      await database.execAsync('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets", "categories");');

      // Restore categories
      if (backupData.data.categories && backupData.data.categories.length > 0) {
        const catStmt = await database.prepareAsync(
          `INSERT INTO categories (id, name, type, icon, color, is_preset, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        try {
          for (const cat of backupData.data.categories) {
            await catStmt.executeAsync([
              cat.id, 
              cat.name, 
              cat.type, 
              cat.icon || null, 
              cat.color || null, 
              cat.is_preset ?? 0, 
              cat.created_at || new Date().toISOString()
            ]);
          }
        } finally {
          await catStmt.finalizeAsync();
        }
      }

      // Restore wallets
      const walletStmt = await database.prepareAsync(
        `INSERT INTO wallets (id, name, currency, initial_balance, type, description, color, is_primary, display_order, exchange_rate, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      try {
        for (const wallet of backupData.data.wallets) {
          await walletStmt.executeAsync([
            wallet.id,
            wallet.name,
            wallet.currency,
            wallet.initial_balance ?? 0,
            wallet.type || null,
            wallet.description || null,
            wallet.color || null,
            wallet.is_primary ?? 0,
            wallet.display_order ?? 0,
            wallet.exchange_rate ?? 1.0,
            wallet.created_at || new Date().toISOString(),
          ]);
        }
      } finally {
        await walletStmt.finalizeAsync();
      }

      // Restore transactions
      const txnStmt = await database.prepareAsync(
        `INSERT INTO transactions (id, wallet_id, type, amount, category, date, notes, receipt_uri, is_recurring, recurrence_frequency, recurrence_end_date, parent_transaction_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      try {
        for (const txn of backupData.data.transactions) {
          await txnStmt.executeAsync([
            txn.id,
            txn.wallet_id,
            txn.type,
            txn.amount,
            txn.category || null,
            txn.date,
            txn.notes || null,
            txn.receipt_uri || null,
            txn.is_recurring ?? 0,
            txn.recurrence_frequency || null,
            txn.recurrence_end_date || null,
            txn.parent_transaction_id || null,
            txn.created_at || new Date().toISOString(),
          ]);
        }
      } finally {
        await txnStmt.finalizeAsync();
      }
    });

    // ✅ Invalidate caches only after successful restore
    const { invalidateTransactionCaches } = await import('../cache/queryCache');
    invalidateTransactionCaches();

    return { success: true };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { 
      success: false, 
      error: error instanceof Error 
        ? `${error.message}. Your existing data was not modified.` 
        : 'Failed to restore backup. Your existing data was not modified.' 
    };
  }
}
```

## Testing Steps

1. Create a backup with valid data
2. Manually corrupt the backup JSON (invalid wallet_id reference in transaction)
3. Attempt to restore the corrupted backup
4. Verify: Database remains in original state (no partial deletion)
5. Verify: Error message indicates data was not modified

## Expected Results

- Failed restore leaves database unchanged (transaction rolled back)
- Success case still works correctly
- Cache invalidation only happens on successful restore
- Clear error message to user

---
