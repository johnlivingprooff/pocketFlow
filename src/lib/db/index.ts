import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { error as logError, log, warn } from '../../utils/logger';
import { enqueueWrite } from './writeQueue';
import { INCOME_TAXONOMY, EXPENSE_TAXONOMY } from '../../constants/categoryTaxonomy';

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
    // Bank Account fields
    const hasAccountType = cols.some(c => c.name === 'accountType');
    if (!hasAccountType) {
      await database.execAsync('ALTER TABLE wallets ADD COLUMN accountType TEXT;');
    }
    const hasAccountNumber = cols.some(c => c.name === 'accountNumber');
    if (!hasAccountNumber) {
      await database.execAsync('ALTER TABLE wallets ADD COLUMN accountNumber TEXT;');
    }
    // Mobile Money fields
    const hasPhoneNumber = cols.some(c => c.name === 'phoneNumber');
    if (!hasPhoneNumber) {
      await database.execAsync('ALTER TABLE wallets ADD COLUMN phoneNumber TEXT;');
    }
    const hasServiceProvider = cols.some(c => c.name === 'serviceProvider');
    if (!hasServiceProvider) {
      await database.execAsync('ALTER TABLE wallets ADD COLUMN serviceProvider TEXT;');
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

  // Create indexes on categories table for fast hierarchy queries
  try {
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_category_id);');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_type_parent ON categories(type, parent_category_id);');
  } catch (e) {
    // noop: indexes may already exist
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
      const hasParentId = catCols.some(c => c.name === 'parent_category_id');
      if (!hasParentId) {
        await database.execAsync(
          'ALTER TABLE categories ADD COLUMN parent_category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE;'
        );
      }
    } catch (e) {
      // noop: best-effort migration
    }

    // Migration: Update preset categories to use SVG icons from taxonomy
    try {
      // Create a mapping of category names to their icons from taxonomy
      const iconMapping: Record<string, string> = {};
      
      // Add icons from INCOME_TAXONOMY
      INCOME_TAXONOMY.forEach(cat => {
        if (cat.icon) {
          iconMapping[cat.name] = cat.icon;
        }
      });
      
      // Add icons from EXPENSE_TAXONOMY
      EXPENSE_TAXONOMY.forEach(cat => {
        if (cat.icon) {
          iconMapping[cat.name] = cat.icon;
        }
      });
      
      // Add legacy category mappings for backward compatibility
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

      const updateStmt = await database.prepareAsync('UPDATE categories SET icon = ? WHERE name = ? AND is_preset = 1;');
      try {
        // Update from taxonomy first (these are the new comprehensive categories)
        for (const [name, icon] of Object.entries(iconMapping)) {
          await updateStmt.executeAsync([icon, name]);
        }
        // Then update legacy mappings for any old categories still in database
        for (const [name, icon] of Object.entries(legacyMapping)) {
          await updateStmt.executeAsync([icon, name]);
        }
      } finally {
        await updateStmt.finalizeAsync();
      }

      // Normalize legacy 'other' icons to explicit money send/receive icons by type
      await database.runAsync("UPDATE categories SET icon = 'moneyrecive' WHERE icon = 'other' AND type = 'income';");
      await database.runAsync("UPDATE categories SET icon = 'moneysend' WHERE icon = 'other' AND type = 'expense';");
    } catch (e) {
      // noop
    }

    // Goals Table: Track income-based savings targets
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_progress REAL NOT NULL DEFAULT 0,
        target_date TEXT NOT NULL,
        notes TEXT,
        linked_wallet_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
        CHECK(target_amount > 0),
        CHECK(current_progress >= 0)
      );`
    );

    // Create indexes for goals
    try {
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_goals_wallet_id ON goals(linked_wallet_id);');
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);');
    } catch (e) {
      // noop: indexes may already exist
    }

    // Budgets Table: Track spending limits by category and period
    await database.execAsync(
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
        linked_wallet_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(subcategory_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
        CHECK(limit_amount > 0),
        CHECK(current_spending >= 0)
      );`
    );

    // Create indexes for budgets
    try {
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_budgets_wallet_id ON budgets(linked_wallet_id);');
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);');
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);');
    } catch (e) {
      // noop: indexes may already exist
    }

    // Seed or repair preset categories (idempotent via INSERT OR IGNORE)
  // Use essential taxonomy only
  
  await database.withTransactionAsync(async () => {
    // Determine allowed preset names (parents + subcategories) for cleanup
    const allowedNames = new Set<string>();
    INCOME_TAXONOMY.forEach(cat => {
      allowedNames.add(cat.name);
      (cat.subcategories || []).forEach(sub => allowedNames.add(sub));
    });
    EXPENSE_TAXONOMY.forEach(cat => {
      allowedNames.add(cat.name);
      (cat.subcategories || []).forEach(sub => allowedNames.add(sub));
    });
    const allowedList = Array.from(allowedNames);

    // If presets exist, remove any preset not in the new essential list
    const existingPresets = await database.getAllAsync<{ name: string }>(
      'SELECT name FROM categories WHERE is_preset = 1 LIMIT 1;'
    );

    if (existingPresets.length > 0 && allowedList.length > 0) {
      const placeholders = allowedList.map(() => '?').join(', ');
      await database.runAsync(
        `DELETE FROM categories WHERE is_preset = 1 AND name NOT IN (${placeholders});`,
        allowedList
      );
    }
    
    // Category color mapping for essential taxonomy
    const incomeCategoryColors: Record<string, string> = {
      'Work Income': '#F9A825', // Gold - earned income
      'Business Income': '#2E7D32', // Deep green - growth
      'Investment Income': '#1B5E20', // Dark green - long-term
      'Support & Transfers': '#1976D2', // Blue - trusted inflow
    };
    
    const expenseCategoryColors: Record<string, string> = {
      'Housing': '#1A237E', // Navy - stability
      'Food': '#FF6F00', // Orange - nourishment
      'Transport': '#00897B', // Teal - movement
      'Utilities & Communication': '#00ACC1', // Cyan - connectivity
    };
    
    // Insert new essential preset categories
    const insertStmt = await database.prepareAsync(
      'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color, parent_category_id) VALUES (?, ?, ?, 1, ?, ?);'
    );
    const updateStmt = await database.prepareAsync(
      'UPDATE categories SET color = ? WHERE name = ? AND type = ? AND is_preset = 1;'
    );
    
    try {
      // Insert Income categories
      for (const mainCat of INCOME_TAXONOMY) {
        const categoryColor = incomeCategoryColors[mainCat.name] || '#66BB6A'; // Default green
        
        // Update existing color to ensure palette is applied
        await updateStmt.executeAsync([categoryColor, mainCat.name, 'income']);

        // Insert main category
        await insertStmt.executeAsync([
          mainCat.name,
          'income',
          mainCat.icon || 'moneyrecive', // Use icon from taxonomy
          categoryColor,
          null // No parent
        ]);
        
        // Get the main category ID for subcategories
        const mainCatRow = await database.getAllAsync<{ id: number }>(
          'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
          [mainCat.name, 'income']
        );
        
        if (mainCatRow.length > 0 && mainCat.subcategories) {
          const parentId = mainCatRow[0].id;
          
          // Insert subcategories - inherit parent's color and icon
          for (const subCat of mainCat.subcategories) {
            // Update subcategory color
            await updateStmt.executeAsync([categoryColor, subCat, 'income']);

            await insertStmt.executeAsync([
              subCat,
              'income',
              mainCat.icon || 'moneyrecive', // Inherit parent's icon
              categoryColor, // Inherit parent's color
              parentId
            ]);
          }
        }
      }
      
      // Insert Expense categories
      for (const mainCat of EXPENSE_TAXONOMY) {
        const categoryColor = expenseCategoryColors[mainCat.name] || '#607D8B'; // Default grey-blue
        
        // Update existing color to ensure palette is applied
        await updateStmt.executeAsync([categoryColor, mainCat.name, 'expense']);

        // Insert main category
        await insertStmt.executeAsync([
          mainCat.name,
          'expense',
          mainCat.icon || 'moneysend', // Use icon from taxonomy
          categoryColor,
          null // No parent
        ]);
        
        // Get the main category ID for subcategories
        const mainCatRow = await database.getAllAsync<{ id: number }>(
          'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
          [mainCat.name, 'expense']
        );
        
        if (mainCatRow.length > 0 && mainCat.subcategories) {
          const parentId = mainCatRow[0].id;
          
          // Insert subcategories - inherit parent's color and icon
          for (const subCat of mainCat.subcategories) {
            // Update subcategory color
            await updateStmt.executeAsync([categoryColor, subCat, 'expense']);

            await insertStmt.executeAsync([
              subCat,
              'expense',
              mainCat.icon || 'moneysend', // Inherit parent's icon
              categoryColor, // Inherit parent's color
              parentId
            ]);
          }
        }
      }
    } finally {
      await insertStmt.finalizeAsync();
      await updateStmt.finalizeAsync();
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
    
    // Re-seed preset categories using new comprehensive taxonomy
    await database.withTransactionAsync(async () => {
      // Category color mapping based on color psychology
      const incomeCategoryColors: Record<string, string> = {
        'Agriculture & Farming': '#4CAF50',
        'Business': '#2E7D32',
        'Employment': '#F9A825',
        'Investments': '#1B5E20',
        'Remittances': '#1976D2',
        'Government Support': '#1565C0',
        'Religious Organizations': '#FBC02D',
        'Sales': '#43A047',
        'Other Income': '#66BB6A'
      };
      
      const expenseCategoryColors: Record<string, string> = {
        'Agriculture & Farming': '#4CAF50',
        'Business Operations': '#757575',
        'Education': '#7B1FA2',
        'Financial Services': '#616161',
        'Food & Dining': '#FF6F00',
        'Healthcare & Medical': '#00897B',
        'Housing & Utilities': '#1A237E',
        'Insurance & Savings': '#0288D1',
        'Loans & Debt': '#D32F2F',
        'Personal Care & Lifestyle': '#E91E63',
        'Taxes & Fees': '#757575',
        'Transport & Fuel': '#00897B',
        'Communication': '#00ACC1',
        'Social & Community': '#F9A825',
        'Household Items': '#A1887F',
        'Other Expenses': '#607D8B'
      };
      
      const statement = await database.prepareAsync(
        'INSERT INTO categories (name, type, icon, is_preset, color, parent_category_id) VALUES (?, ?, ?, 1, ?, ?);'
      );
      
      try {
        // Insert Income categories
        for (const mainCat of INCOME_TAXONOMY) {
          const categoryColor = incomeCategoryColors[mainCat.name] || '#66BB6A';
          
          await statement.executeAsync([
            mainCat.name,
            'income',
            mainCat.icon || 'moneyrecive', // Use icon from taxonomy
            categoryColor,
            null
          ]);
          
          const mainCatRow = await database.getAllAsync<{ id: number }>(
            'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
            [mainCat.name, 'income']
          );
          
          if (mainCatRow.length > 0 && mainCat.subcategories) {
            const parentId = mainCatRow[0].id;
            
            // Subcategories inherit parent's color and icon
            for (const subCat of mainCat.subcategories) {
              await statement.executeAsync([
                subCat,
                'income',
                mainCat.icon || 'moneyrecive', // Inherit parent's icon
                categoryColor,
                parentId
              ]);
            }
          }
        }
        
        // Insert Expense categories
        for (const mainCat of EXPENSE_TAXONOMY) {
          const categoryColor = expenseCategoryColors[mainCat.name] || '#607D8B';
          
          await statement.executeAsync([
            mainCat.name,
            'expense',
            mainCat.icon || 'moneysend', // Use icon from taxonomy
            categoryColor,
            null
          ]);
          
          const mainCatRow = await database.getAllAsync<{ id: number }>(
            'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
            [mainCat.name, 'expense']
          );
          
          if (mainCatRow.length > 0 && mainCat.subcategories) {
            const parentId = mainCatRow[0].id;
            
            // Subcategories inherit parent's color and icon
            for (const subCat of mainCat.subcategories) {
              await statement.executeAsync([
                subCat,
                'expense',
                mainCat.icon || 'moneysend', // Inherit parent's icon
                categoryColor,
                parentId
              ]);
            }
          }
        }
      } finally {
        await statement.finalizeAsync();
      }
    });
  }, 'clear_database');
}
