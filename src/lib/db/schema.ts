import { EXPENSE_TAXONOMY, INCOME_TAXONOMY } from '@/constants/categories';
import { error as logError, log } from '@/utils/logger';

type TableInfoRow = {
  name: string;
  notnull?: number;
};

type QueryResultRow = Record<string, unknown>;

type QueryResult = {
  rows?: {
    _array?: QueryResultRow[];
  };
};

type TransactionExecutor = {
  executeAsync: (sql: string, params?: unknown[]) => Promise<QueryResult>;
};

type SchemaDatabase = {
  execute: (sql: string, params?: unknown[]) => QueryResult;
  executeAsync: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  transaction: (callback: (tx: TransactionExecutor) => Promise<void>) => Promise<void>;
};

function getRows<T extends QueryResultRow>(result: QueryResult): T[] {
  return (result.rows?._array || []) as T[];
}

function bestEffort(run: () => void): void {
  try {
    run();
  } catch {
    // Intentionally ignored for startup migrations.
  }
}

function ensureIndexes(database: SchemaDatabase, statements: string[]): void {
  bestEffort(() => {
    for (const statement of statements) {
      database.execute(statement);
    }
  });
}

function getTableInfo(database: SchemaDatabase, tableName: string): TableInfoRow[] {
  return getRows<TableInfoRow>(database.execute(`PRAGMA table_info(${tableName});`));
}

function addColumnIfMissing(
  database: SchemaDatabase,
  columns: TableInfoRow[],
  columnName: string,
  alterStatement: string
): void {
  if (!columns.some((column) => column.name === columnName)) {
    database.execute(alterStatement);
  }
}

function ensureWalletsTable(database: SchemaDatabase): void {
  database.execute(
    `CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      initial_balance REAL DEFAULT 0,
      type TEXT,
      color TEXT,
      created_at TEXT,
      is_primary INTEGER DEFAULT 0,
      cloud_wallet_id TEXT,
      created_by TEXT,
      is_shared INTEGER DEFAULT 0,
      share_id TEXT UNIQUE,
      shared_role TEXT,
      sync_status TEXT DEFAULT 'offline'
    );`
  );

  bestEffort(() => {
    const columns = getTableInfo(database, 'wallets');
    addColumnIfMissing(database, columns, 'description', 'ALTER TABLE wallets ADD COLUMN description TEXT;');
    addColumnIfMissing(database, columns, 'exchange_rate', 'ALTER TABLE wallets ADD COLUMN exchange_rate REAL DEFAULT 1.0;');
    addColumnIfMissing(database, columns, 'display_order', 'ALTER TABLE wallets ADD COLUMN display_order INTEGER DEFAULT 0;');
    addColumnIfMissing(database, columns, 'accountType', 'ALTER TABLE wallets ADD COLUMN accountType TEXT;');
    addColumnIfMissing(database, columns, 'accountNumber', 'ALTER TABLE wallets ADD COLUMN accountNumber TEXT;');
    addColumnIfMissing(database, columns, 'phoneNumber', 'ALTER TABLE wallets ADD COLUMN phoneNumber TEXT;');
    addColumnIfMissing(database, columns, 'serviceProvider', 'ALTER TABLE wallets ADD COLUMN serviceProvider TEXT;');
    addColumnIfMissing(database, columns, 'cloud_wallet_id', 'ALTER TABLE wallets ADD COLUMN cloud_wallet_id TEXT;');
    addColumnIfMissing(database, columns, 'created_by', 'ALTER TABLE wallets ADD COLUMN created_by TEXT;');
    addColumnIfMissing(database, columns, 'is_shared', 'ALTER TABLE wallets ADD COLUMN is_shared INTEGER DEFAULT 0;');
    addColumnIfMissing(database, columns, 'share_id', 'ALTER TABLE wallets ADD COLUMN share_id TEXT;');
    addColumnIfMissing(database, columns, 'shared_role', 'ALTER TABLE wallets ADD COLUMN shared_role TEXT;');
    addColumnIfMissing(database, columns, 'sync_status', "ALTER TABLE wallets ADD COLUMN sync_status TEXT DEFAULT 'offline';");
  });

  ensureIndexes(database, [
    'CREATE INDEX IF NOT EXISTS idx_wallets_share_id ON wallets(share_id);',
    'CREATE INDEX IF NOT EXISTS idx_wallets_created_by ON wallets(created_by);',
    'CREATE INDEX IF NOT EXISTS idx_wallets_is_shared ON wallets(is_shared);',
  ]);
}

async function normalizeWalletDisplayOrder(database: SchemaDatabase): Promise<void> {
  try {
    const walletsNeedingFix = getRows<{ created_at?: string; id: number }>(
      database.execute('SELECT id, created_at FROM wallets WHERE display_order = 0 ORDER BY created_at ASC;')
    );

    if (walletsNeedingFix.length === 0) {
      return;
    }

    await database.transaction(async (tx) => {
      for (let index = 0; index < walletsNeedingFix.length; index++) {
        const wallet = walletsNeedingFix[index];
        await tx.executeAsync('UPDATE wallets SET display_order = ? WHERE id = ?;', [index, wallet.id]);
      }
    });
    log(`[DB] Migration: Fixed display_order for ${walletsNeedingFix.length} existing wallets`);
  } catch {
    // ignore best-effort migration
  }
}

function ensureTransactionsTable(database: SchemaDatabase): void {
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
    const columns = getTableInfo(database, 'transactions');
    addColumnIfMissing(database, columns, 'recurrence_frequency', 'ALTER TABLE transactions ADD COLUMN recurrence_frequency TEXT;');
    addColumnIfMissing(database, columns, 'recurrence_end_date', 'ALTER TABLE transactions ADD COLUMN recurrence_end_date TEXT;');
    addColumnIfMissing(database, columns, 'parent_transaction_id', 'ALTER TABLE transactions ADD COLUMN parent_transaction_id INTEGER;');
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    console.error('[DB] CRITICAL: Transaction migration failed:', typedError);
    console.error('[DB] Migration error details:', typedError.message, typedError.code);
  }

  ensureIndexes(database, [
    'CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_wallet_type ON transactions(wallet_id, type);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);',
  ]);

  bestEffort(() => {
    database.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_unique 
      ON transactions(parent_transaction_id, date) 
      WHERE parent_transaction_id IS NOT NULL;
    `);
  });
}

function ensureCategoriesTable(database: SchemaDatabase): void {
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

  bestEffort(() => {
    const columns = getTableInfo(database, 'categories');
    addColumnIfMissing(database, columns, 'budget', 'ALTER TABLE categories ADD COLUMN budget REAL DEFAULT NULL;');
    addColumnIfMissing(
      database,
      columns,
      'parent_category_id',
      'ALTER TABLE categories ADD COLUMN parent_category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE;'
    );
    addColumnIfMissing(database, columns, 'user_modified', 'ALTER TABLE categories ADD COLUMN user_modified TEXT;');
  });

  ensureIndexes(database, [
    'CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);',
    'CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_category_id);',
    'CREATE INDEX IF NOT EXISTS idx_categories_type_parent ON categories(type, parent_category_id);',
  ]);
}

function hasColumn(columns: TableInfoRow[], columnName: string): boolean {
  return columns.some((column) => column.name === columnName);
}

function buildJsonArrayExpression(
  columns: TableInfoRow[],
  jsonColumnName: string,
  singleValueColumnName?: string
): string {
  if (hasColumn(columns, jsonColumnName)) {
    if (singleValueColumnName && hasColumn(columns, singleValueColumnName)) {
      return `CASE
        WHEN ${jsonColumnName} IS NOT NULL AND TRIM(${jsonColumnName}) != '' THEN ${jsonColumnName}
        WHEN ${singleValueColumnName} IS NOT NULL THEN '[' || ${singleValueColumnName} || ']'
        ELSE '[]'
      END`;
    }

    return `CASE
      WHEN ${jsonColumnName} IS NOT NULL AND TRIM(${jsonColumnName}) != '' THEN ${jsonColumnName}
      ELSE '[]'
    END`;
  }

  if (singleValueColumnName && hasColumn(columns, singleValueColumnName)) {
    return `CASE
      WHEN ${singleValueColumnName} IS NOT NULL THEN '[' || ${singleValueColumnName} || ']'
      ELSE '[]'
    END`;
  }

  return `'[]'`;
}

function rebuildGoalsTable(database: SchemaDatabase, columns: TableInfoRow[]): void {
  const hasData =
    (getRows<{ count: number }>(database.execute('SELECT COUNT(*) as count FROM goals;'))[0]?.count ?? 0) > 0;
  const startDateExpression = hasColumn(columns, 'start_date') ? 'COALESCE(start_date, created_at)' : 'created_at';
  const linkedWalletIdsExpression = buildJsonArrayExpression(columns, 'linked_wallet_ids', 'linked_wallet_id');

  database.execute('PRAGMA foreign_keys = OFF;');
  database.execute('DROP TABLE IF EXISTS goals_new;');
  database.execute(`
    CREATE TABLE goals_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_progress REAL NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      target_date TEXT NOT NULL,
      notes TEXT,
      linked_wallet_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK(target_amount > 0),
      CHECK(current_progress >= 0)
    );
  `);

  if (hasData) {
    database.execute(`
      INSERT INTO goals_new (
        id, name, target_amount, current_progress, start_date, target_date, notes,
        linked_wallet_ids, created_at, updated_at
      )
      SELECT
        id,
        name,
        target_amount,
        current_progress,
        ${startDateExpression} as start_date,
        target_date,
        notes,
        ${linkedWalletIdsExpression} as linked_wallet_ids,
        created_at,
        updated_at
      FROM goals;
    `);
  }

  database.execute('DROP TABLE goals;');
  database.execute('ALTER TABLE goals_new RENAME TO goals;');
  database.execute("UPDATE goals SET linked_wallet_ids = '[]' WHERE linked_wallet_ids IS NULL OR TRIM(linked_wallet_ids) = '';");
  database.execute('PRAGMA foreign_keys = ON;');
}

function rebuildBudgetsTable(database: SchemaDatabase, columns: TableInfoRow[]): void {
  const hasData =
    (getRows<{ count: number }>(database.execute('SELECT COUNT(*) as count FROM budgets;'))[0]?.count ?? 0) > 0;
  const categoryIdsExpression = buildJsonArrayExpression(columns, 'category_ids', 'category_id');
  const subcategoryIdsExpression = buildJsonArrayExpression(columns, 'subcategory_ids', 'subcategory_id');
  const linkedWalletIdsExpression = buildJsonArrayExpression(columns, 'linked_wallet_ids', 'linked_wallet_id');
  const isRecurringExpression = hasColumn(columns, 'is_recurring') ? 'COALESCE(is_recurring, 0)' : '0';
  const recurrenceEndDateExpression = hasColumn(columns, 'recurrence_end_date') ? 'recurrence_end_date' : 'NULL';
  const recurrenceParentIdExpression = hasColumn(columns, 'recurrence_parent_id') ? 'recurrence_parent_id' : 'NULL';

  database.execute('PRAGMA foreign_keys = OFF;');
  database.execute('DROP TABLE IF EXISTS budgets_new;');
  database.execute(`
    CREATE TABLE budgets_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_ids TEXT NOT NULL DEFAULT '[]',
      subcategory_ids TEXT NOT NULL DEFAULT '[]',
      limit_amount REAL NOT NULL,
      current_spending REAL NOT NULL DEFAULT 0,
      period_type TEXT NOT NULL CHECK(period_type IN ('weekly', 'monthly', 'custom')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      linked_wallet_ids TEXT NOT NULL DEFAULT '[]',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_end_date TEXT,
      recurrence_parent_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(recurrence_parent_id) REFERENCES budgets(id) ON DELETE SET NULL,
      CHECK(limit_amount > 0),
      CHECK(current_spending >= 0)
    );
  `);

  if (hasData) {
    database.execute(`
      INSERT INTO budgets_new (
        id, name, category_ids, subcategory_ids, limit_amount, current_spending,
        period_type, start_date, end_date, notes, linked_wallet_ids,
        is_recurring, recurrence_end_date, recurrence_parent_id, created_at, updated_at
      )
      SELECT
        id,
        name,
        ${categoryIdsExpression} as category_ids,
        ${subcategoryIdsExpression} as subcategory_ids,
        limit_amount,
        current_spending,
        period_type,
        start_date,
        end_date,
        notes,
        ${linkedWalletIdsExpression} as linked_wallet_ids,
        ${isRecurringExpression} as is_recurring,
        ${recurrenceEndDateExpression} as recurrence_end_date,
        ${recurrenceParentIdExpression} as recurrence_parent_id,
        created_at,
        updated_at
      FROM budgets;
    `);
  }

  database.execute('DROP TABLE budgets;');
  database.execute('ALTER TABLE budgets_new RENAME TO budgets;');
  database.execute("UPDATE budgets SET category_ids = '[]' WHERE category_ids IS NULL OR TRIM(category_ids) = '';");
  database.execute("UPDATE budgets SET subcategory_ids = '[]' WHERE subcategory_ids IS NULL OR TRIM(subcategory_ids) = '';");
  database.execute("UPDATE budgets SET linked_wallet_ids = '[]' WHERE linked_wallet_ids IS NULL OR TRIM(linked_wallet_ids) = '';");
  database.execute('PRAGMA foreign_keys = ON;');
}

async function migratePresetCategoryIcons(database: SchemaDatabase): Promise<void> {
  try {
    const iconMapping: Record<string, string> = {};

    for (const category of INCOME_TAXONOMY) {
      if (category.icon) {
        iconMapping[category.name] = category.icon;
      }
    }

    for (const category of EXPENSE_TAXONOMY) {
      if (category.icon) {
        iconMapping[category.name] = category.icon;
      }
    }

    const legacyMapping: Record<string, string> = {
      Bills: 'bills',
      Entertainment: 'tv',
      Food: 'food',
      Freelance: 'internet',
      Groceries: 'groceries',
      Healthcare: 'health',
      Investments: 'stock',
      Offering: 'gift',
      Other: 'moneysend',
      'Other Expenses': 'moneysend',
      'Other Income': 'moneyrecive',
      Rent: 'home',
      Salary: 'salary',
      Shopping: 'shopping',
      Transfer: 'transfer',
      Transport: 'fuel',
      Utilities: 'electricity',
    };

    await database.transaction(async (tx) => {
      for (const [name, icon] of Object.entries(iconMapping)) {
        await tx.executeAsync(
          'UPDATE categories SET icon = ? WHERE name = ? AND is_preset = 1 AND icon IS NULL AND user_modified IS NULL;',
          [icon, name]
        );
      }

      for (const [name, icon] of Object.entries(legacyMapping)) {
        await tx.executeAsync(
          'UPDATE categories SET icon = ? WHERE name = ? AND is_preset = 1 AND icon = ? AND user_modified IS NULL;',
          [icon, name, 'other']
        );
      }
    });

    await database.executeAsync(
      "UPDATE categories SET icon = 'moneyrecive' WHERE icon = 'other' AND type = 'income' AND is_preset = 1 AND user_modified IS NULL;"
    );
    await database.executeAsync(
      "UPDATE categories SET icon = 'moneysend' WHERE icon = 'other' AND type = 'expense' AND is_preset = 1 AND user_modified IS NULL;"
    );
  } catch {
    // ignore best-effort migration
  }
}

function ensureGoalsTable(database: SchemaDatabase): void {
  database.execute(
    `CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_progress REAL NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      target_date TEXT NOT NULL,
      notes TEXT,
      linked_wallet_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK(target_amount > 0),
      CHECK(current_progress >= 0)
    );`
  );

  bestEffort(() => {
    const columns = getTableInfo(database, 'goals');
    const requiresRebuild =
      !hasColumn(columns, 'start_date') ||
      !hasColumn(columns, 'linked_wallet_ids') ||
      hasColumn(columns, 'linked_wallet_id') ||
      hasColumn(columns, 'category_ids');

    if (requiresRebuild) {
      log('[DB] Rebuilding goals table to array-only relation schema');
      rebuildGoalsTable(database, columns);
    }

    database.execute("UPDATE goals SET linked_wallet_ids = '[]' WHERE linked_wallet_ids IS NULL OR TRIM(linked_wallet_ids) = '';");
    database.execute('DROP INDEX IF EXISTS idx_goals_wallet_id;');
  });

  ensureIndexes(database, [
    'CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);',
  ]);
}

function ensureBudgetsTable(database: SchemaDatabase): void {
  database.execute(
    `CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_ids TEXT NOT NULL DEFAULT '[]',
      subcategory_ids TEXT NOT NULL DEFAULT '[]',
      limit_amount REAL NOT NULL,
      current_spending REAL NOT NULL DEFAULT 0,
      period_type TEXT NOT NULL CHECK(period_type IN ('weekly', 'monthly', 'custom')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      linked_wallet_ids TEXT NOT NULL DEFAULT '[]',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_end_date TEXT,
      recurrence_parent_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(recurrence_parent_id) REFERENCES budgets(id) ON DELETE SET NULL,
      CHECK(limit_amount > 0),
      CHECK(current_spending >= 0)
    );`
  );

  bestEffort(() => {
    const columns = getTableInfo(database, 'budgets');
    const requiresRebuild =
      !hasColumn(columns, 'category_ids') ||
      !hasColumn(columns, 'subcategory_ids') ||
      !hasColumn(columns, 'linked_wallet_ids') ||
      !hasColumn(columns, 'is_recurring') ||
      !hasColumn(columns, 'recurrence_end_date') ||
      !hasColumn(columns, 'recurrence_parent_id') ||
      hasColumn(columns, 'category_id') ||
      hasColumn(columns, 'subcategory_id') ||
      hasColumn(columns, 'linked_wallet_id');

    if (requiresRebuild) {
      log('[DB] Rebuilding budgets table to array-only relation schema');
      rebuildBudgetsTable(database, columns);
    }

    database.execute("UPDATE budgets SET category_ids = '[]' WHERE category_ids IS NULL OR TRIM(category_ids) = '';");
    database.execute("UPDATE budgets SET subcategory_ids = '[]' WHERE subcategory_ids IS NULL OR TRIM(subcategory_ids) = '';");
    database.execute("UPDATE budgets SET linked_wallet_ids = '[]' WHERE linked_wallet_ids IS NULL OR TRIM(linked_wallet_ids) = '';");
    database.execute('DROP INDEX IF EXISTS idx_budgets_wallet_id;');
    database.execute('DROP INDEX IF EXISTS idx_budgets_category_id;');
  });

  ensureIndexes(database, [
    'CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);',
    'CREATE INDEX IF NOT EXISTS idx_budgets_recurrence_parent ON budgets(recurrence_parent_id);',
  ]);
}

async function seedPresetCategories(database: SchemaDatabase): Promise<void> {
  await database.transaction(async (tx) => {
    const allowedNames = new Set<string>();

    for (const category of INCOME_TAXONOMY) {
      allowedNames.add(category.name);
      for (const subcategory of category.subcategories || []) {
        allowedNames.add(subcategory);
      }
    }

    for (const category of EXPENSE_TAXONOMY) {
      allowedNames.add(category.name);
      for (const subcategory of category.subcategories || []) {
        allowedNames.add(subcategory);
      }
    }

    const allowedList = Array.from(allowedNames);
    const existingPresets = getRows<{ name: string }>(
      await tx.executeAsync('SELECT name FROM categories WHERE is_preset = 1 LIMIT 1;')
    );

    if (existingPresets.length > 0 && allowedList.length > 0) {
      const placeholders = allowedList.map(() => '?').join(', ');
      await tx.executeAsync(
        `DELETE FROM categories WHERE is_preset = 1 AND name NOT IN (${placeholders});`,
        allowedList
      );
    }

    const incomeCategoryColors: Record<string, string> = {
      'Business Income': '#2E7D32',
      'Investment Income': '#1B5E20',
      'Support & Transfers': '#1976D2',
      'Work Income': '#F9A825',
    };

    const expenseCategoryColors: Record<string, string> = {
      Food: '#FF6F00',
      Housing: '#1A237E',
      Transport: '#00897B',
      'Utilities & Communication': '#00ACC1',
    };

    for (const category of INCOME_TAXONOMY) {
      const categoryColor = incomeCategoryColors[category.name] || '#66BB6A';

      await tx.executeAsync(
        'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color) VALUES (?, ?, ?, 1, ?);',
        [category.name, 'income', category.icon || 'moneyrecive', categoryColor]
      );

      const mainCategoryRows = getRows<{ id: number }>(
        await tx.executeAsync(
          'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
          [category.name, 'income']
        )
      );
      const parentId = mainCategoryRows[0]?.id;
      if (parentId == null) {
        continue;
      }

      for (const subcategory of category.subcategories || []) {
        await tx.executeAsync(
          'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color, parent_category_id) VALUES (?, ?, ?, 1, ?, ?);',
          [subcategory, 'income', category.icon || 'moneyrecive', categoryColor, parentId]
        );
      }
    }

    for (const category of EXPENSE_TAXONOMY) {
      const categoryColor = expenseCategoryColors[category.name] || '#607D8B';

      await tx.executeAsync(
        'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color) VALUES (?, ?, ?, 1, ?);',
        [category.name, 'expense', category.icon || 'moneysend', categoryColor]
      );

      const mainCategoryRows = getRows<{ id: number }>(
        await tx.executeAsync(
          'SELECT id FROM categories WHERE name = ? AND type = ? AND is_preset = 1;',
          [category.name, 'expense']
        )
      );
      const parentId = mainCategoryRows[0]?.id;
      if (parentId == null) {
        continue;
      }

      for (const subcategory of category.subcategories || []) {
        await tx.executeAsync(
          'INSERT OR IGNORE INTO categories (name, type, icon, is_preset, color, parent_category_id) VALUES (?, ?, ?, 1, ?, ?);',
          [subcategory, 'expense', category.icon || 'moneysend', categoryColor, parentId]
        );
      }
    }
  });
}

export async function ensureSchema(database: SchemaDatabase, schemaVersion: number): Promise<void> {
  try {
    database.execute(`PRAGMA user_version = ${schemaVersion};`);
  } catch (error) {
    logError('[DB] Failed to set schema version:', error as Error);
  }

  ensureWalletsTable(database);
  await normalizeWalletDisplayOrder(database);
  ensureTransactionsTable(database);
  ensureCategoriesTable(database);
  await migratePresetCategoryIcons(database);
  ensureGoalsTable(database);
  ensureBudgetsTable(database);
  await seedPresetCategories(database);
}

export async function clearCoreTables(database: SchemaDatabase): Promise<void> {
  await database.transaction(async (tx) => {
    await tx.executeAsync('DELETE FROM transactions;');
    await tx.executeAsync('DELETE FROM wallets;');
    await tx.executeAsync('DELETE FROM categories;');
    await tx.executeAsync('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets", "categories");');
  });
}
