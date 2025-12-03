import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web. Please use iOS or Android.');
  }
  if (!db) {
    db = await SQLite.openDatabaseAsync('pocketflow.db');
  }
  return db;
}

export async function exec<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const database = await getDb();
  const result = await database.getAllAsync<T>(sql, params);
  return result;
}

export async function execRun(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
  const database = await getDb();
  return await database.runAsync(sql, params);
}

export async function ensureTables() {
  const database = await getDb();
  
  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      initial_balance REAL DEFAULT 0,
      type TEXT,
      color TEXT,
      created_at TEXT,
      is_primary INTEGER DEFAULT 0
    );`
  );

  // Migration: add missing columns if the DB was created before
  try {
    const cols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(wallets);');
    const hasDescription = cols.some(c => c.name === 'description');
    if (!hasDescription) {
      await database.execAsync('ALTER TABLE wallets ADD COLUMN description TEXT;');
    }
    const hasExchangeRate = cols.some(c => c.name === 'exchange_rate');
    if (!hasExchangeRate) {
      await database.execAsync('ALTER TABLE wallets ADD COLUMN exchange_rate REAL DEFAULT 1.0;');
    }
      const hasDisplayOrder = cols.some(c => c.name === 'display_order');
      if (!hasDisplayOrder) {
        await database.execAsync('ALTER TABLE wallets ADD COLUMN display_order INTEGER DEFAULT 0;');
      }
  } catch (e) {
    // noop: best-effort migration
  }

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      type TEXT CHECK(type IN ('income','expense')),
      amount REAL NOT NULL,
      category TEXT,
      date TEXT NOT NULL,
      notes TEXT,
      receipt_uri TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(wallet_id) REFERENCES wallets(id)
    );`
  );

  // Migration: add recurring transaction columns if not present
  try {
    const txnCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(transactions);');
    const hasIsRecurring = txnCols.some(c => c.name === 'is_recurring');
    if (!hasIsRecurring) {
      await database.execAsync('ALTER TABLE transactions ADD COLUMN is_recurring INTEGER DEFAULT 0;');
    }
    const hasRecurrenceFrequency = txnCols.some(c => c.name === 'recurrence_frequency');
    if (!hasRecurrenceFrequency) {
      await database.execAsync('ALTER TABLE transactions ADD COLUMN recurrence_frequency TEXT;');
    }
    const hasRecurrenceEndDate = txnCols.some(c => c.name === 'recurrence_end_date');
    if (!hasRecurrenceEndDate) {
      await database.execAsync('ALTER TABLE transactions ADD COLUMN recurrence_end_date TEXT;');
    }
    const hasParentTransactionId = txnCols.some(c => c.name === 'parent_transaction_id');
    if (!hasParentTransactionId) {
      await database.execAsync('ALTER TABLE transactions ADD COLUMN parent_transaction_id INTEGER;');
    }
  } catch (e) {
    // noop: best-effort migration
  }

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT CHECK(type IN ('income','expense','both')),
      icon TEXT,
      color TEXT,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`
  );

  // Seed preset categories if empty
  const existingCategories = await database.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  if (existingCategories[0].count === 0) {
    const presetExpense = [
      { name: 'Food', icon: '🍔' },
      { name: 'Transport', icon: '🚗' },
      { name: 'Rent', icon: '🏠' },
      { name: 'Groceries', icon: '🛒' },
      { name: 'Utilities', icon: '💡' },
      { name: 'Shopping', icon: '🛍️' },
      { name: 'Healthcare', icon: '⚕️' },
      { name: 'Entertainment', icon: '🎬' },
      { name: 'Education', icon: '📚' },
      { name: 'Bills', icon: '📄' },
      { name: 'Other', icon: '📊' }
    ];
    const presetIncome = [
      { name: 'Salary', icon: '💰' },
      { name: 'Freelance', icon: '💼' },
      { name: 'Business', icon: '🏢' },
      { name: 'Investment', icon: '📈' },
      { name: 'Gift', icon: '🎁' },
      { name: 'Offering', icon: '🙏' },
      { name: 'Other Income', icon: '💵' }
    ];
    
    for (const cat of presetExpense) {
      await database.runAsync(
        'INSERT INTO categories (name, type, icon, is_preset) VALUES (?, ?, ?, 1);',
        [cat.name, 'expense', cat.icon]
      );
    }
    
    for (const cat of presetIncome) {
      await database.runAsync(
        'INSERT INTO categories (name, type, icon, is_preset) VALUES (?, ?, ?, 1);',
        [cat.name, 'income', cat.icon]
      );
    }
  }
}

/**
 * Clear all data from the database
 * WARNING: This is destructive and cannot be undone
 */
export async function clearDatabase() {
  const database = await getDb();
  
  // Delete all data from tables
  await database.execAsync('DELETE FROM transactions;');
  await database.execAsync('DELETE FROM wallets;');
  await database.execAsync('DELETE FROM categories;');
  
  // Reset autoincrement counters
  await database.execAsync('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets", "categories");');
  
  // Re-seed preset categories
  const presetExpense = [
    { name: 'Food', icon: '🍔' },
    { name: 'Transport', icon: '🚗' },
    { name: 'Rent', icon: '🏠' },
    { name: 'Groceries', icon: '🛒' },
    { name: 'Utilities', icon: '💡' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Healthcare', icon: '⚕️' },
    { name: 'Entertainment', icon: '🎬' },
    { name: 'Education', icon: '📚' },
    { name: 'Bills', icon: '📄' },
    { name: 'Other', icon: '📊' }
  ];
  const presetIncome = [
    { name: 'Salary', icon: '💰' },
    { name: 'Freelance', icon: '💼' },
    { name: 'Business', icon: '🏢' },
    { name: 'Investment', icon: '📈' },
    { name: 'Gift', icon: '🎁' },
    { name: 'Offering', icon: '🙏' },
    { name: 'Other Income', icon: '💵' }
  ];
  
  for (const cat of presetExpense) {
    await database.runAsync(
      'INSERT INTO categories (name, type, icon, is_preset) VALUES (?, ?, ?, 1);',
      [cat.name, 'expense', cat.icon]
    );
  }
  
  for (const cat of presetIncome) {
    await database.runAsync(
      'INSERT INTO categories (name, type, icon, is_preset) VALUES (?, ?, ?, 1);',
      [cat.name, 'income', cat.icon]
    );
  }
}
