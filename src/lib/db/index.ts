
import { open } from 'react-native-nitro-sqlite';
import type { NitroSQLiteConnection } from 'react-native-nitro-sqlite';
import { enableSimpleNullHandling } from 'react-native-nitro-sqlite';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { log, error as logError, warn } from '@/utils/logger';
import { INCOME_TAXONOMY, EXPENSE_TAXONOMY } from '@/constants/categories';

let dbPromise: Promise<NitroSQLiteConnection> | null = null;

// Schema version - increment this when making breaking schema changes
const CURRENT_SCHEMA_VERSION = 3;

async function resolveDbPath(): Promise<string> {
  // For nitro-sqlite with just a name, the database is stored in the app's data directory
  // We need to construct the full path for file operations like deletion
  const dir = (FileSystem as any).documentDirectory;
  if (!dir) throw new Error('Could not resolve document directory for database');
  const cleanDir = dir.startsWith('file://') ? dir.replace('file://', '') : dir;
  return `${cleanDir}SQLite/pocketflow.db`;
}

async function openDb(): Promise<NitroSQLiteConnection> {
  // Enable simple null handling for nitro-sqlite
  enableSimpleNullHandling(true);
  
  let db: NitroSQLiteConnection;
  try {
    db = open({ name: 'pocketflow.db' });
    try {
      const integrityCheck = db.execute('PRAGMA integrity_check;');
      const result = integrityCheck.rows?._array[0];
      const isCorrupt = result && result.integrity_check !== 'ok';
      if (isCorrupt) {
        logError('[DB] Database corruption detected! Deleting and recreating database...');
        db.close();
        try {
          // For nitro-sqlite, we need to construct the path to the database file for deletion
          const dir = (FileSystem as any).documentDirectory;
          if (dir) {
            const cleanDir = dir.startsWith('file://') ? dir.replace('file://', '') : dir;
            const dbPath = `${cleanDir}SQLite/pocketflow.db`;
            await FileSystem.deleteAsync(`file://${dbPath}`, { idempotent: true });
          } else {
            logError('[DB] Cannot delete corrupted database: document directory not available');
          }
        } catch (deleteErr) {
          logError('[DB] Failed to delete corrupted database file:', deleteErr as any);
        }
        db = open({ name: 'pocketflow.db' });
        log('[DB] Fresh database created successfully');
      } else {
        log('[DB] Database integrity check passed');
      }
    } catch (integrityError: any) {
      logError('[DB] Integrity check failed, database may be corrupted:', integrityError);
    }
    try {
      db.execute('PRAGMA journal_mode = WAL;');
      log('[DB] WAL mode enabled successfully');
      db.execute('PRAGMA busy_timeout = 5000;'); // 5 seconds
      db.execute('PRAGMA synchronous = NORMAL;');
      log('[DB] Database connection opened successfully with WAL mode enabled');
    } catch (pragmaError: any) {
      logError('[DB] Failed to configure database PRAGMAs:', pragmaError);
      warn('[DB] Database opened but not optimally configured - lock errors may occur');
    }
    return db;
  } catch (err: any) {
    logError('[DB] Failed to open database:', err);
    throw new Error(`Failed to open database: ${err?.message || err}`);
  }
}

export async function getDbAsync(): Promise<NitroSQLiteConnection> {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.product === 'ReactNative' && Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web. Please use iOS or Android.');
  }
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}

// Synchronous fallback for legacy code (will throw if not initialized)
let _dbSync: NitroSQLiteConnection | null = null;
export function getDbSync(): NitroSQLiteConnection {
  if (_dbSync) return _dbSync;
  throw new Error('Database not initialized. Use getDbAsync() and await initialization before use.');
}

// Call this once at app startup (e.g. in _layout.tsx)
export async function initDb(): Promise<void> {
  _dbSync = await getDbAsync();
}


export async function exec<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const database = await getDbAsync();
    const result = await database.executeAsync(sql, params);
    return (result.rows?._array || []) as T[];
  } catch (err: any) {
    logError('[DB] Query execution failed:', { sql, params, error: err });
    throw err;
  }
}


export async function execRun(sql: string, params: any[] = []): Promise<any> {
  try {
    const database = await getDbAsync();
    const result = await database.executeAsync(sql, params);
    return result;
  } catch (err: any) {
    logError('[DB] Run execution failed:', { sql, params, error: err });
    throw err;
  }
}

export async function ensureTables() {
  const database = await getDbAsync();
  
  // Set schema version
  try {
    database.execute(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
  } catch (e: any) {
    logError('[DB] Failed to set schema version:', e);
  }

      database.execute(
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

      try {
        const colsResult = database.execute('PRAGMA table_info(wallets);');
        const cols = colsResult.rows?._array || [];
        const hasDescription = cols.some(c => c.name === 'description');
        if (!hasDescription) {
          database.execute('ALTER TABLE wallets ADD COLUMN description TEXT;');
        }
        const hasExchangeRate = cols.some(c => c.name === 'exchange_rate');
        if (!hasExchangeRate) {
          database.execute('ALTER TABLE wallets ADD COLUMN exchange_rate REAL DEFAULT 1.0;');
        }
        const hasDisplayOrder = cols.some(c => c.name === 'display_order');
        if (!hasDisplayOrder) {
          database.execute('ALTER TABLE wallets ADD COLUMN display_order INTEGER DEFAULT 0;');
        }
        const hasAccountType = cols.some(c => c.name === 'accountType');
        if (!hasAccountType) {
          database.execute('ALTER TABLE wallets ADD COLUMN accountType TEXT;');
        }
        const hasAccountNumber = cols.some(c => c.name === 'accountNumber');
        if (!hasAccountNumber) {
          database.execute('ALTER TABLE wallets ADD COLUMN accountNumber TEXT;');
        }
        const hasPhoneNumber = cols.some(c => c.name === 'phoneNumber');
        if (!hasPhoneNumber) {
          database.execute('ALTER TABLE wallets ADD COLUMN phoneNumber TEXT;');
        }
        const hasServiceProvider = cols.some(c => c.name === 'serviceProvider');
        if (!hasServiceProvider) {
          database.execute('ALTER TABLE wallets ADD COLUMN serviceProvider TEXT;');
        }
      } catch (e) {
        // noop: best-effort migration
      }

      try {
        const walletsNeedingFixResult = database.execute(
          'SELECT id, created_at FROM wallets WHERE display_order = 0 ORDER BY created_at ASC;'
        );
        const walletsNeedingFix = walletsNeedingFixResult.rows?._array || [];

        if (walletsNeedingFix.length > 0) {
          await database.transaction(async (tx) => {
            for (let i = 0; i < walletsNeedingFix.length; i++) {
              const wallet = walletsNeedingFix[i];
              if (wallet && wallet.id != null) {
                await tx.executeAsync('UPDATE wallets SET display_order = ? WHERE id = ?;', [i, wallet.id]);
              }
            }
          });
          log(`[DB] Migration: Fixed display_order for ${walletsNeedingFix.length} existing wallets`);
        }
      } catch (e) {
        // noop: migration may have already run or wallet table doesn't exist yet
      }

      database.execute(
        `CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wallet_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          category TEXT,
          date TEXT NOT NULL,
          notes TEXT,
          receipt_path TEXT,
          created_at TEXT,
          is_recurring INTEGER DEFAULT 0
        );`
      );
      
      try {
        const txnColsResult = database.execute('PRAGMA table_info(transactions);');
        const txnCols = txnColsResult.rows?._array || [];
        const hasRecurrenceFrequency = txnCols.some(c => c.name === 'recurrence_frequency');

        if (!hasRecurrenceFrequency) {
          console.log('[DB] Adding missing recurrence_frequency column...');
          database.execute('ALTER TABLE transactions ADD COLUMN recurrence_frequency TEXT;');
          console.log('[DB] Migration: Added recurrence_frequency column');
        }
        const hasRecurrenceEndDate = txnCols.some(c => c.name === 'recurrence_end_date');
        if (!hasRecurrenceEndDate) {
          console.log('[DB] Adding missing recurrence_end_date column...');
          database.execute('ALTER TABLE transactions ADD COLUMN recurrence_end_date TEXT;');
          console.log('[DB] Migration: Added recurrence_end_date column');
        }
        const hasParentTransactionId = txnCols.some(c => c.name === 'parent_transaction_id');
        if (!hasParentTransactionId) {
          console.log('[DB] Adding missing parent_transaction_id column...');
          database.execute('ALTER TABLE transactions ADD COLUMN parent_transaction_id INTEGER;');
          console.log('[DB] Migration: Added parent_transaction_id column');
        }

        console.log('[DB] Transaction table migrations completed successfully');
      } catch (e: any) {
        console.error('[DB] CRITICAL: Migration failed:', e);
        console.error('[DB] Migration error details:', e.message, e.code);
      }

  try {
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_wallet_type ON transactions(wallet_id, type);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);');
  } catch (e) {
    // noop: indexes may already exist
  }

  try {
    database.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_unique 
      ON transactions(parent_transaction_id, date) 
      WHERE parent_transaction_id IS NOT NULL;
    `);
  } catch (e) {
    // Index may already exist
  }

  try {
    database.execute('CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_category_id);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_categories_type_parent ON categories(type, parent_category_id);');
  } catch (e) {
    // noop: indexes may already exist
  }

  database.execute(
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('income','expense','both')),
      icon TEXT,
      color TEXT,
      is_preset INTEGER DEFAULT 0,
      user_modified TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, type)
    );`
  );

    try {
      const catColsResult = database.execute('PRAGMA table_info(categories);');
      const catCols = catColsResult.rows?._array || [];
      const hasBudget = catCols.some(c => c.name === 'budget');
      if (!hasBudget) {
        database.execute('ALTER TABLE categories ADD COLUMN budget REAL DEFAULT NULL;');
      }
      const hasParentId = catCols.some(c => c.name === 'parent_category_id');
      if (!hasParentId) {
        database.execute(
          'ALTER TABLE categories ADD COLUMN parent_category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE;'
        );
      }
      const hasUserModified = catCols.some(c => c.name === 'user_modified');
      if (!hasUserModified) {
        database.execute('ALTER TABLE categories ADD COLUMN user_modified TEXT;');
      }
    } catch (e) {
      // noop: best-effort migration
    }

    try {
      // Migration: Update icons for existing preset categories that still have default values
      // Only update categories that haven't been customized by users
      const iconMapping: Record<string, string> = {};

      INCOME_TAXONOMY.forEach(cat => {
        if (cat.icon) {
          iconMapping[cat.name] = cat.icon;
        }
      });

      EXPENSE_TAXONOMY.forEach(cat => {
        if (cat.icon) {
          iconMapping[cat.name] = cat.icon;
        }
      });

      const legacyMapping: Record<string, string> = {
        'Food': 'food',
        'Transport': 'fuel',
        'Healthcare': 'health',
        'Entertainment': 'tv',
        'Shopping': 'shopping',
        'Bills': 'bills',
        'Investments': 'stock',
        'Other': 'moneysend',
        'Other Income': 'moneyrecive',
        'Other Expenses': 'moneysend',
        'Groceries': 'groceries',
        'Rent': 'home',
        'Utilities': 'electricity',
        'Transfer': 'transfer',
        'Freelance': 'internet',
        'Offering': 'gift',
        'Salary': 'salary'
      };

      // Only update icons for categories that haven't been modified by users
      await database.transaction(async (tx) => {
        for (const [name, newIcon] of Object.entries(iconMapping)) {
          await tx.executeAsync(
            'UPDATE categories SET icon = ? WHERE name = ? AND is_preset = 1 AND icon IS NULL AND user_modified IS NULL;',
            [newIcon, name]
          );
        }
        for (const [name, newIcon] of Object.entries(legacyMapping)) {
          await tx.executeAsync(
            'UPDATE categories SET icon = ? WHERE name = ? AND is_preset = 1 AND icon = ? AND user_modified IS NULL;',
            [newIcon, name, 'other']
          );
        }
      });

      // Only update "other" categories that haven't been customized
      await execRun("UPDATE categories SET icon = 'moneyrecive' WHERE icon = 'other' AND type = 'income' AND is_preset = 1 AND user_modified IS NULL;");
      await execRun("UPDATE categories SET icon = 'moneysend' WHERE icon = 'other' AND type = 'expense' AND is_preset = 1 AND user_modified IS NULL;");
    } catch (e) {
      // noop
    }

    database.execute(
      `CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_progress REAL NOT NULL DEFAULT 0,
        target_date TEXT NOT NULL,
        notes TEXT,
        linked_wallet_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
        CHECK(target_amount > 0),
        CHECK(current_progress >= 0)
      );`
    );

    try {
      const goalColsResult = database.execute('PRAGMA table_info(goals);');
      const goalCols = goalColsResult.rows?._array || [];
      const hasLinkedWalletIds = goalCols.some(c => c.name === 'linked_wallet_ids');
      if (!hasLinkedWalletIds) {
        database.execute('ALTER TABLE goals ADD COLUMN linked_wallet_ids TEXT;');
      }
      const hasCategoryIds = goalCols.some(c => c.name === 'category_ids');
      if (!hasCategoryIds) {
        database.execute('ALTER TABLE goals ADD COLUMN category_ids TEXT;');
      }
      
      // Migration: Fix NOT NULL constraints on legacy columns for existing databases
      try {
        const linkedWalletIdCol = goalCols.find(c => c.name === 'linked_wallet_id');
        if (linkedWalletIdCol && linkedWalletIdCol.notnull === 1) {
          log('[DB] Migrating goals table: Removing NOT NULL from linked_wallet_id');
          const countResult = database.execute('SELECT COUNT(*) as count FROM goals;');
          const hasData = (countResult.rows?._array?.[0]?.count as number) > 0;
          
          database.execute('PRAGMA foreign_keys = OFF;');
          database.execute(`
            CREATE TABLE goals_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              target_amount REAL NOT NULL,
              current_progress REAL NOT NULL DEFAULT 0,
              target_date TEXT NOT NULL,
              notes TEXT,
              linked_wallet_id INTEGER,
              linked_wallet_ids TEXT,
              category_ids TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
              CHECK(target_amount > 0),
              CHECK(current_progress >= 0)
            );
          `);
          
          if (hasData) {
            database.execute(`
              INSERT INTO goals_new 
              SELECT id, name, target_amount, current_progress, target_date, notes, 
                     linked_wallet_id, linked_wallet_ids, category_ids, created_at, updated_at 
              FROM goals;
            `);
          }
          
          database.execute('DROP TABLE goals;');
          database.execute('ALTER TABLE goals_new RENAME TO goals;');
          database.execute('PRAGMA foreign_keys = ON;');
          log('[DB] Successfully migrated goals table schema');
        }
      } catch (migrationErr: any) {
        logError('[DB] Error migrating goals table NOT NULL constraints:', migrationErr);
      }
    } catch (e) {
      // noop: best-effort migration
    }

    try {
      database.execute('CREATE INDEX IF NOT EXISTS idx_goals_wallet_id ON goals(linked_wallet_id);');
      database.execute('CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);');
    } catch (e) {
      // noop: indexes may already exist
    }

    database.execute(
      `CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        subcategory_id INTEGER,
        limit_amount REAL NOT NULL,
        current_spending REAL NOT NULL DEFAULT 0,
        period_type TEXT NOT NULL CHECK(period_type IN ('weekly', 'monthly', 'custom')),
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        notes TEXT,
        linked_wallet_id INTEGER,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurrence_end_date TEXT,
        recurrence_parent_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(subcategory_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
        FOREIGN KEY(recurrence_parent_id) REFERENCES budgets(id) ON DELETE SET NULL,
        CHECK(limit_amount > 0),
        CHECK(current_spending >= 0)
      );`
    );

    try {
      const budgetColsResult = database.execute('PRAGMA table_info(budgets);');
      const budgetCols = budgetColsResult.rows?._array || [];
      const hasLinkedWalletIds = budgetCols.some(c => c.name === 'linked_wallet_ids');
      if (!hasLinkedWalletIds) {
        database.execute('ALTER TABLE budgets ADD COLUMN linked_wallet_ids TEXT;');
      }
      const hasCategoryIds = budgetCols.some(c => c.name === 'category_ids');
      if (!hasCategoryIds) {
        database.execute('ALTER TABLE budgets ADD COLUMN category_ids TEXT;');
      }
      const hasSubcategoryIds = budgetCols.some(c => c.name === 'subcategory_ids');
      if (!hasSubcategoryIds) {
        database.execute('ALTER TABLE budgets ADD COLUMN subcategory_ids TEXT;');
      }
      const hasIsRecurring = budgetCols.some(c => c.name === 'is_recurring');
      if (!hasIsRecurring) {
        database.execute('ALTER TABLE budgets ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;');
      }
      const hasRecurrenceEndDate = budgetCols.some(c => c.name === 'recurrence_end_date');
      if (!hasRecurrenceEndDate) {
        database.execute('ALTER TABLE budgets ADD COLUMN recurrence_end_date TEXT;');
      }
      const hasRecurrenceParentId = budgetCols.some(c => c.name === 'recurrence_parent_id');
      if (!hasRecurrenceParentId) {
        database.execute('ALTER TABLE budgets ADD COLUMN recurrence_parent_id INTEGER;');
      }
      
      // Migration: Fix NOT NULL constraints on legacy columns for existing databases
      // These columns were required in old schema but are now optional
      try {
        // Check if linked_wallet_id still has NOT NULL constraint
        const linkedWalletIdCol = budgetCols.find(c => c.name === 'linked_wallet_id');
        if (linkedWalletIdCol && linkedWalletIdCol.notnull === 1) {
          log('[DB] Migrating budgets table: Removing NOT NULL from linked_wallet_id');
          // SQLite doesn't support removing NOT NULL directly, so we recreate the table
          const countResult = database.execute('SELECT COUNT(*) as count FROM budgets;');
          const hasData = (countResult.rows?._array?.[0]?.count as number) > 0;
          
          // Data exists, perform safe migration
          database.execute('PRAGMA foreign_keys = OFF;');
          database.execute(`
            CREATE TABLE budgets_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              category_id INTEGER,
              subcategory_id INTEGER,
              category_ids TEXT,
              subcategory_ids TEXT,
              limit_amount REAL NOT NULL,
              current_spending REAL NOT NULL DEFAULT 0,
              period_type TEXT NOT NULL CHECK(period_type IN ('weekly', 'monthly', 'custom')),
              start_date TEXT NOT NULL,
              end_date TEXT NOT NULL,
              notes TEXT,
              linked_wallet_id INTEGER,
              linked_wallet_ids TEXT,
              is_recurring INTEGER NOT NULL DEFAULT 0,
              recurrence_end_date TEXT,
              recurrence_parent_id INTEGER,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
              FOREIGN KEY(subcategory_id) REFERENCES categories(id) ON DELETE SET NULL,
              FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
              FOREIGN KEY(recurrence_parent_id) REFERENCES budgets(id) ON DELETE SET NULL,
              CHECK(limit_amount > 0),
              CHECK(current_spending >= 0)
            );
          `);
          
          if (hasData) {
            database.execute(`
              INSERT INTO budgets_new 
              SELECT id, name, category_id, subcategory_id, category_ids, subcategory_ids, 
                     limit_amount, current_spending, period_type, start_date, end_date, notes, 
                     linked_wallet_id, linked_wallet_ids, is_recurring, recurrence_end_date, recurrence_parent_id,
                     created_at, updated_at 
              FROM budgets;
            `);
          }
          
          database.execute('DROP TABLE budgets;');
          database.execute('ALTER TABLE budgets_new RENAME TO budgets;');
          database.execute('PRAGMA foreign_keys = ON;');
          log('[DB] Successfully migrated budgets table schema');
        }
      } catch (migrationErr: any) {
        logError('[DB] Error migrating budgets table NOT NULL constraints:', migrationErr);
        // Continue anyway - the constraint may have already been fixed
      }
    } catch (e) {
      // noop: best-effort migration
    }

    try {
      database.execute('CREATE INDEX IF NOT EXISTS idx_budgets_wallet_id ON budgets(linked_wallet_id);');
      database.execute('CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);');
      database.execute('CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);');
      database.execute('CREATE INDEX IF NOT EXISTS idx_budgets_recurrence_parent ON budgets(recurrence_parent_id);');
    } catch (e) {
      // noop: indexes may already exist
    }

  
  await database.transaction(async (tx) => {
    const allowedNames = new Set<string>();
    INCOME_TAXONOMY.forEach(cat => {
      allowedNames.add(cat.name);
      (cat.subcategories || []).forEach(sub => allowedNames.add(sub));
    });
    EXPENSE_TAXONOMY.forEach(cat => {
      allowedNames.add(cat.name);
      (cat.subcategories || []).forEach(sub => allowedNames.add(sub));
    });
    const allowedList = Array.from(allowedNames).filter(name => name != null);

    const existingPresetsResult = await tx.executeAsync(
      'SELECT name FROM categories WHERE is_preset = 1 LIMIT 1;'
    );
    const existingPresets = existingPresetsResult.rows?._array || [];

    if (existingPresets.length > 0 && allowedList.length > 0) {
      const placeholders = allowedList.map(() => '?').join(', ');
      await tx.executeAsync(
        `DELETE FROM categories WHERE is_preset = 1 AND name NOT IN (${placeholders});`,
        allowedList
      );
    }
    
    const incomeCategoryColors: Record<string, string> = {
      'Work Income': '#F9A825',
      'Business Income': '#2E7D32',
      'Investment Income': '#1B5E20',
      'Support & Transfers': '#1976D2',
    };
    
    const expenseCategoryColors: Record<string, string> = {
      'Housing': '#1A237E',
      'Food': '#FF6F00',
      'Transport': '#00897B',
      'Utilities & Communication': '#00ACC1',
    };
    
      for (const mainCat of INCOME_TAXONOMY) {
        const categoryColor = incomeCategoryColors[mainCat.name] || '#66BB6A';
        
        await tx.executeAsync(
          'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color) VALUES (?, ?, ?, 1, ?);',
          [mainCat.name, 'income', mainCat.icon || 'moneyrecive', categoryColor]
        );
        
        const mainCatRowResult = await tx.executeAsync(
          'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
          [mainCat.name, 'income']
        );
        const mainCatRow = mainCatRowResult.rows?._array || [];
        
        if (mainCatRow.length > 0 && mainCat.subcategories) {
          const parentId = mainCatRow[0].id;
          if (parentId != null) {
            for (const subCat of mainCat.subcategories) {
              await tx.executeAsync(
                'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color, parent_category_id) VALUES (?, ?, ?, 1, ?, ?);',
                [subCat, 'income', mainCat.icon || 'moneyrecive', categoryColor, parentId]
              );
            }
          }
        }
      }
      
      for (const mainCat of EXPENSE_TAXONOMY) {
        const categoryColor = expenseCategoryColors[mainCat.name] || '#607D8B';
        
        await tx.executeAsync(
          'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color) VALUES (?, ?, ?, 1, ?);',
          [mainCat.name, 'expense', mainCat.icon || 'moneysend', categoryColor]
        );
        
        const mainCatRowResult = await tx.executeAsync(
          'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
          [mainCat.name, 'expense']
        );
        const mainCatRow = mainCatRowResult.rows?._array || [];

        if (mainCatRow.length > 0 && mainCat.subcategories) {
          const parentId = mainCatRow[0].id;
          if (parentId != null) {
            for (const subCat of mainCat.subcategories) {
              await tx.executeAsync(
                'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color, parent_category_id) VALUES (?, ?, ?, 1, ?, ?);',
                [subCat, 'expense', mainCat.icon || 'moneysend', categoryColor, parentId]
              );
            }
          }
        }
      }
  });
}

export async function clearDatabase() {
  const database = await getDbAsync();
  
  await database.transaction(async (tx) => {
    await tx.executeAsync('DELETE FROM transactions;');
    await tx.executeAsync('DELETE FROM wallets;');
    await tx.executeAsync('DELETE FROM categories;');
    
    await tx.executeAsync('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets", "categories");');
  });
}
