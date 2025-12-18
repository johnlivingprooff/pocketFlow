// --- Nitro SQLite DB Layer (expo-sqlite/next) ---
import { open } from 'react-native-nitro-sqlite'; // Nitro SQLite
import { Platform } from 'react-native';
import { error as logError, log, warn } from '../../utils/logger';
import { INCOME_TAXONOMY, EXPENSE_TAXONOMY } from '../../constants/categoryTaxonomy';

let db: ReturnType<typeof open> | null = null;

export function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('Nitro SQLite is not supported on web. Please use iOS or Android.');
  }
  if (!db) {
    db = open({ name: 'pocketflow.db', location: 'default' });
    try {
      const integrityCheck = db.execute('PRAGMA integrity_check;');
      const isCorrupt = Array.isArray(integrityCheck) && integrityCheck.some((row: { integrity_check: string }) => row.integrity_check !== 'ok');
      if (isCorrupt) {
        db = open({ name: 'pocketflow.db', location: 'default' });
      }
    } catch (e) {
      // ignore, let ensureTables handle schema
    }
    try {
      db.execute('PRAGMA journal_mode = WAL;');
      db.execute('PRAGMA busy_timeout = 5000;');
      db.execute('PRAGMA synchronous = NORMAL;');
    } catch (e) {
      // ignore
    }
  }
  return db!;
}

export function exec<T = any>(sql: string, params: any[] = []): T[] {
  try {
    const database = getDb();
    const result = database.execute(sql, params);
    // For SELECT queries, result is an array. For write queries, it's a result object.
    // This function is intended for SELECTs, so we ensure it always returns an array.
    return Array.isArray(result) ? result : [];
  } catch (err) {
    logError('[DB] exec (SELECT) failed', { sql, params, error: err });
    throw err;
  }
}

/**
 * Executes a write operation (INSERT, UPDATE, DELETE) and returns the result.
 */
export function execRun(sql: string, params: any[] = []): { lastInsertRowId: number, rowsAffected: number } {
  try {
    const database = getDb();
    const result = database.execute(sql, params);
    // For write queries, the result object is returned directly.
    // If it's an array (e.g., from a SELECT), we return a default object.
    if (Array.isArray(result)) {
      return { lastInsertRowId: 0, rowsAffected: 0 };
    }
    return result;
  } catch (err) {
    logError('[DB] execRun (WRITE) failed', { sql, params, error: err });
    throw err;
  }
}

export function ensureTables() {
  const database = getDb();
  // Wallets
  database.execute(`CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    initial_balance REAL DEFAULT 0,
    type TEXT,
    color TEXT,
    created_at TEXT,
    is_primary INTEGER DEFAULT 0
  );`);
  // Wallets migrations
  try {
    const cols = database.execute('PRAGMA table_info(wallets);');
    if (Array.isArray(cols)) {
      if (!cols.some((c: { name: string }) => c.name === 'description')) database.execute('ALTER TABLE wallets ADD COLUMN description TEXT;');
      if (!cols.some((c: { name: string }) => c.name === 'exchange_rate')) database.execute('ALTER TABLE wallets ADD COLUMN exchange_rate REAL DEFAULT 1.0;');
      if (!cols.some((c: { name: string }) => c.name === 'display_order')) database.execute('ALTER TABLE wallets ADD COLUMN display_order INTEGER DEFAULT 0;');
      if (!cols.some((c: { name: string }) => c.name === 'accountType')) database.execute('ALTER TABLE wallets ADD COLUMN accountType TEXT;');
      if (!cols.some((c: { name: string }) => c.name === 'accountNumber')) database.execute('ALTER TABLE wallets ADD COLUMN accountNumber TEXT;');
      if (!cols.some((c: { name: string }) => c.name === 'phoneNumber')) database.execute('ALTER TABLE wallets ADD COLUMN phoneNumber TEXT;');
      if (!cols.some((c: { name: string }) => c.name === 'serviceProvider')) database.execute('ALTER TABLE wallets ADD COLUMN serviceProvider TEXT;');
    }
  } catch {}
  // Fix display_order for legacy wallets
  try {
    const wallets = database.execute('SELECT id FROM wallets WHERE display_order = 0 ORDER BY created_at ASC;');
    if (Array.isArray(wallets) && wallets.length > 0) {
      for (let i = 0; i < wallets.length; i++) {
        database.execute('UPDATE wallets SET display_order = ? WHERE id = ?;', [i, wallets[i].id]);
      }
    }
  } catch {}

  // Transactions
  database.execute(`CREATE TABLE IF NOT EXISTS transactions (
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
  );`);
  // Transactions migrations
  try {
    const txnCols = database.execute('PRAGMA table_info(transactions);');
    if (Array.isArray(txnCols)) {
      if (!txnCols.some((c: { name: string }) => c.name === 'category')) database.execute('ALTER TABLE transactions ADD COLUMN category TEXT;');
      if (!txnCols.some((c: { name: string }) => c.name === 'is_recurring')) database.execute('ALTER TABLE transactions ADD COLUMN is_recurring INTEGER DEFAULT 0;');
      if (!txnCols.some((c: { name: string }) => c.name === 'recurrence_frequency')) database.execute('ALTER TABLE transactions ADD COLUMN recurrence_frequency TEXT;');
      if (!txnCols.some((c: { name: string }) => c.name === 'recurrence_end_date')) database.execute('ALTER TABLE transactions ADD COLUMN recurrence_end_date TEXT;');
      if (!txnCols.some((c: { name: string }) => c.name === 'parent_transaction_id')) database.execute('ALTER TABLE transactions ADD COLUMN parent_transaction_id INTEGER;');
    }
  } catch {}
  // Indexes
  try {
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_wallet_type ON transactions(wallet_id, type);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);');
    database.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_unique ON transactions(parent_transaction_id, date) WHERE parent_transaction_id IS NOT NULL;');
  } catch {}

  // Categories
  database.execute(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income','expense','both')),
    icon TEXT,
    color TEXT,
    is_preset INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type)
  );`);
  // Categories migrations
  try {
    const catCols = database.execute('PRAGMA table_info(categories);');
    if (Array.isArray(catCols)) {
      if (!catCols.some((c: { name: string }) => c.name === 'budget')) database.execute('ALTER TABLE categories ADD COLUMN budget REAL DEFAULT NULL;');
      if (!catCols.some((c: { name: string }) => c.name === 'parent_category_id')) database.execute('ALTER TABLE categories ADD COLUMN parent_category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE;');
    }
  } catch {}
  // Update preset category icons
  try {
    const iconMapping: Record<string, string> = {};
    INCOME_TAXONOMY.forEach((cat: any) => { if (cat.icon) iconMapping[cat.name] = cat.icon; });
    EXPENSE_TAXONOMY.forEach((cat: any) => { if (cat.icon) iconMapping[cat.name] = cat.icon; });
    const legacyMapping: Record<string, string> = {
      'Food': 'food', 'Transport': 'fuel', 'Healthcare': 'health', 'Entertainment': 'tv', 'Shopping': 'shopping',
      'Bills': 'bills', 'Investments': 'stock', 'Other': 'moneysend', 'Other Income': 'moneyrecive',
      'Other Expenses': 'moneysend', 'Groceries': 'groceries', 'Rent': 'home', 'Utilities': 'electricity',
      'Transfer': 'transfer', 'Freelance': 'internet', 'Offering': 'gift', 'Salary': 'salary'
    };
    for (const [name, icon] of Object.entries(iconMapping)) {
      database.execute('UPDATE categories SET icon = ? WHERE name = ? AND is_preset = 1;', [icon, name]);
    }
    for (const [name, icon] of Object.entries(legacyMapping)) {
      database.execute('UPDATE categories SET icon = ? WHERE name = ? AND is_preset = 1;', [icon, name]);
    }
    database.execute("UPDATE categories SET icon = 'moneyrecive' WHERE icon = 'other' AND type = 'income';");
    database.execute("UPDATE categories SET icon = 'moneysend' WHERE icon = 'other' AND type = 'expense';");
  } catch {}

  // Goals Table
  database.execute(`CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    target_date TEXT,
    notes TEXT,
    linked_wallet_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL
  );`);
  // Indexes for goals
  try {
    database.execute('CREATE INDEX IF NOT EXISTS idx_goals_wallet_id ON goals(linked_wallet_id);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);');
  } catch {}

  // Budgets Table
  database.execute(`CREATE TABLE IF NOT EXISTS budgets (
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
  );`);
  // Indexes for budgets
  try {
    database.execute('CREATE INDEX IF NOT EXISTS idx_budgets_wallet_id ON budgets(linked_wallet_id);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);');
    database.execute('CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);');
  } catch {}
}

/**
 * Clear all data from the database
 * WARNING: This is destructive and cannot be undone
 */
export function clearDatabase() {
  const database = getDb();
  database.execute('DELETE FROM transactions;');
  database.execute('DELETE FROM wallets;');
  database.execute('DELETE FROM categories;');
  database.execute('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets", "categories");'); // Nitro SQLite sequence reset
}
