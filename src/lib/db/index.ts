import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { error as logError, log } from '../../utils/logger';
import { enqueueWrite } from './writeQueue';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web. Please use iOS or Android.');
  }
  if (!db) {
    try {
      db = await SQLite.openDatabaseAsync('pocketflow.db');
      
      // RELEASE-BUILD FIX: Enable WAL mode and busy timeout to prevent database lock errors
      // These PRAGMA commands are critical for the fix to work properly
      try {
        // WAL (Write-Ahead Logging) reduces write lock contention for concurrent operations
        const walResult = await db.execAsync('PRAGMA journal_mode = WAL;');
        log('[DB] WAL mode enabled successfully');
        
        // busy_timeout makes writers wait instead of immediately failing with SQLITE_BUSY
        await db.execAsync('PRAGMA busy_timeout = 5000;'); // 5 seconds
        
        // NORMAL mode provides crash safety (survives app crashes) but not power failure protection.
        // This is acceptable for mobile apps and significantly faster than FULL synchronous mode.
        // Trade-off: Faster writes vs. protection against OS crashes/power failures.
        await db.execAsync('PRAGMA synchronous = NORMAL;');
        
        log('[DB] Database connection opened successfully with WAL mode enabled');
      } catch (pragmaError: any) {
        // PRAGMA failures are critical - if we can't configure the database properly,
        // we're at risk of lock errors. Log the error but don't fail initialization
        // since the database may still be usable (though with higher lock risk).
        logError('[DB] Failed to configure database PRAGMAs:', pragmaError);
        warn('[DB] Database opened but not optimally configured - lock errors may occur');
      }
    } catch (err: any) {
      logError('[DB] Failed to open database:', err);
      throw new Error('Failed to open database. Please restart the app.');
    }
  }
  return db;
}

export async function exec<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const database = await getDb();
    const result = await database.getAllAsync<T>(sql, params);
    return result;
  } catch (err: any) {
    logError('[DB] Query execution failed:', { sql, params, error: err });
    throw err;
  }
}

export async function execRun(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
  // Serialize all write operations through write queue to prevent SQLITE_BUSY errors
  return enqueueWrite(async () => {
    try {
      const database = await getDb();
      const result = await database.runAsync(sql, params);
      return result;
    } catch (err: any) {
      logError('[DB] Run execution failed:', { sql, params, error: err });
      throw err;
    }
  }, 'execRun');
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

  // Migration: fix display_order for existing wallets that all have display_order=0
  // This ensures wallets are sorted consistently by position, not by created_at
  try {
    const walletsNeedingFix = await database.getAllAsync<{ id: number; created_at: string }>(
      'SELECT id, created_at FROM wallets WHERE display_order = 0 ORDER BY created_at ASC;'
    );
    
    if (walletsNeedingFix.length > 0) {
      // Update each wallet with a sequential display_order based on creation order
      const statement = await database.prepareAsync('UPDATE wallets SET display_order = ? WHERE id = ?;');
      try {
        for (let i = 0; i < walletsNeedingFix.length; i++) {
          await statement.executeAsync([i, walletsNeedingFix[i].id]);
        }
      } finally {
        await statement.finalizeAsync();
      }
      
      log(`[DB] Migration: Fixed display_order for ${walletsNeedingFix.length} existing wallets`);
    }
  } catch (e) {
    // noop: migration may have already run or wallet table doesn't exist yet
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

  // Create indexes for performance optimization
  // These indexes dramatically improve query performance on filtered columns
  try {
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_wallet_type ON transactions(wallet_id, type);');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);');
  } catch (e) {
    // noop: indexes may already exist
  }

  // Create index to enforce uniqueness of recurring instances
  // This prevents duplicate generation of the same recurring transaction date
  try {
    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_unique 
      ON transactions(parent_transaction_id, date) 
      WHERE parent_transaction_id IS NOT NULL;
    `);
  } catch (e) {
    // Index may already exist
  }

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('income','expense','both')),
      icon TEXT,
      color TEXT,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, type)
    );`
  );

    // Migration: add budget column if not present
    try {
      const catCols = await database.getAllAsync<{ name: string }>('PRAGMA table_info(categories);');
      const hasBudget = catCols.some(c => c.name === 'budget');
      if (!hasBudget) {
        await database.execAsync('ALTER TABLE categories ADD COLUMN budget REAL DEFAULT NULL;');
      }
    } catch (e) {
      // noop: best-effort migration
    }

    // Seed or repair preset categories (idempotent via INSERT OR IGNORE)
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
  
  await database.withTransactionAsync(async () => {
    const statement = await database.prepareAsync(
      'INSERT OR IGNORE INTO categories (name, type, icon, is_preset) VALUES (?, ?, ?, 1);'
    );
    try {
      for (const cat of presetExpense) {
        await statement.executeAsync([cat.name, 'expense', cat.icon]);
      }
      for (const cat of presetIncome) {
        await statement.executeAsync([cat.name, 'income', cat.icon]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

/**
 * Clear all data from the database
 * WARNING: This is destructive and cannot be undone
 */
export async function clearDatabase() {
  // RELEASE-BUILD FIX: Wrap clear operation in write queue to prevent concurrent access
  return enqueueWrite(async () => {
    const database = await getDb();
    
    // Delete all data from tables in a single transaction
    await database.withTransactionAsync(async () => {
      await database.execAsync('DELETE FROM transactions;');
      await database.execAsync('DELETE FROM wallets;');
      await database.execAsync('DELETE FROM categories;');
      
      // Reset autoincrement counters
      await database.execAsync('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets", "categories");');
    });
    
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
    
    // Batch insert all categories in a single transaction for better performance
    await database.withTransactionAsync(async () => {
      const statement = await database.prepareAsync(
        'INSERT INTO categories (name, type, icon, is_preset) VALUES (?, ?, ?, 1);'
      );
      
      try {
        for (const cat of presetExpense) {
          await statement.executeAsync([cat.name, 'expense', cat.icon]);
        }
        
        for (const cat of presetIncome) {
          await statement.executeAsync([cat.name, 'income', cat.icon]);
        }
      } finally {
        await statement.finalizeAsync();
      }
    });
  }, 'clear_database');
}
