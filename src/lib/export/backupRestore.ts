import * as FileSystem from 'expo-file-system/legacy';
import { yyyyMmDd } from '../../utils/date';
import { exec } from '../db';
import { Alert } from 'react-native';

export interface BackupData {
  version: string;
  exportedAt: string;
  data: {
    wallets: any[];
    transactions: any[];
    categories: any[];
  };
}

/**
 * Creates a complete backup of all app data
 */
export async function createBackup(): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory not available');
    }

    // Fetch all data
    const wallets = await exec('SELECT * FROM wallets ORDER BY created_at DESC');
    const transactions = await exec('SELECT * FROM transactions ORDER BY date DESC');
    const categories = await exec('SELECT * FROM categories ORDER BY name ASC');

    const backupData: BackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        wallets,
        transactions,
        categories,
      },
    };

    // Create backups directory
    const backupsDir = `${documentDir}backups`;
    try {
      await FileSystem.makeDirectoryAsync(backupsDir, { intermediates: true });
    } catch (e) {
      // Directory might already exist
    }

    // Create backup file with timestamp
    const filename = `pocketFlow_backup_${Date.now()}.json`;
    const fileUri = `${backupsDir}/${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { success: true, uri: fileUri };
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create backup' };
  }
}

/**
 * Lists all available backups
 */
export async function listBackups(): Promise<{ filename: string; uri: string; date: Date }[]> {
  try {
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory not available');
    }

    const backupsDir = `${documentDir}backups`;
    
    // Check if backups directory exists
    const dirInfo = await FileSystem.getInfoAsync(backupsDir);
    if (!dirInfo.exists) {
      return [];
    }

    const files = await FileSystem.readDirectoryAsync(backupsDir);
    const backups = files
      .filter((f) => f.startsWith('pocketFlow_backup_') && f.endsWith('.json'))
      .map((f) => {
        const match = f.match(/pocketFlow_backup_(\d+)\.json/);
        const timestamp = match ? parseInt(match[1]) : 0;
        return {
          filename: f,
          uri: `${backupsDir}/${f}`,
          date: new Date(timestamp),
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return backups;
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

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
