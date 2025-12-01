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
  // Check wallets columns and add description if absent
  try {
    const cols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(wallets);');
    const hasDescription = cols.some(c => c.name === 'description');
    if (!hasDescription) {
      await database.execAsync('ALTER TABLE wallets ADD COLUMN description TEXT;');
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
    const presetExpense = ['Food', 'Transport', 'Rent', 'Groceries', 'Utilities', 'Shopping', 'Healthcare', 'Entertainment', 'Education', 'Bills', 'Other'];
    const presetIncome = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Offering', 'Other Income'];
    
    for (const cat of presetExpense) {
      await database.runAsync(
        'INSERT INTO categories (name, type, is_preset) VALUES (?, ?, 1);',
        [cat, 'expense']
      );
    }
    
    for (const cat of presetIncome) {
      await database.runAsync(
        'INSERT INTO categories (name, type, is_preset) VALUES (?, ?, 1);',
        [cat, 'income']
      );
    }
  }
}
