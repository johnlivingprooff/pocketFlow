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

    // Clear existing data
    await exec('DELETE FROM transactions');
    await exec('DELETE FROM wallets');
    await exec('DELETE FROM categories');

    // Restore categories
    for (const cat of backupData.data.categories) {
      await exec(
        `INSERT INTO categories (id, name, type, icon, color, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.created_at, cat.updated_at]
      );
    }

    // Restore wallets
    for (const wallet of backupData.data.wallets) {
      await exec(
        `INSERT INTO wallets (id, name, balance, currency, type, description, color, is_primary, order_index, exchange_rate, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wallet.id,
          wallet.name,
          wallet.balance,
          wallet.currency,
          wallet.type,
          wallet.description,
          wallet.color,
          wallet.is_primary,
          wallet.order_index,
          wallet.exchange_rate,
          wallet.created_at,
          wallet.updated_at,
        ]
      );
    }

    // Restore transactions
    for (const transaction of backupData.data.transactions) {
      await exec(
        `INSERT INTO transactions (id, wallet_id, type, amount, category, date, notes, receipt_uri, is_recurring, recurrence_frequency, recurrence_end_date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.id,
          transaction.wallet_id,
          transaction.type,
          transaction.amount,
          transaction.category,
          transaction.date,
          transaction.notes,
          transaction.receipt_uri,
          transaction.is_recurring,
          transaction.recurrence_frequency,
          transaction.recurrence_end_date,
          transaction.created_at,
          transaction.updated_at,
        ]
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to restore backup' };
  }
}
