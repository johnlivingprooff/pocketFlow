import { exec, getDbAsync } from './index';
import { enqueueWrite } from './writeQueue';
import { getCategories } from './categories';
import {
  resolveBudgetCategoryIds,
  resolveBudgetSubcategoryIds,
  resolveBudgetWalletIds,
  resolveGoalWalletIds,
} from './goalBudgetRows';

type GoalRow = {
  id: number;
  linkedWalletIds: string | null;
  startDate: string;
  endDate: string;
};

type BudgetRow = {
  categoryIds: string | null;
  endDate: string;
  id: number;
  linkedWalletIds: string | null;
  startDate: string;
  subcategoryIds: string | null;
};

type TransactionExecutor = {
  executeAsync: (sql: string, params?: unknown[]) => Promise<unknown>;
};

type GoalUpdate = {
  currentProgress: number;
  id: number;
};

type BudgetUpdate = {
  currentSpending: number;
  id: number;
};

type RefreshDerivedFinanceStateOptions = {
  includeBudgets?: boolean;
  includeGoals?: boolean;
};

function uniqueWalletIds(walletIds: readonly number[]): number[] {
  return Array.from(
    new Set(walletIds.filter((walletId) => Number.isInteger(walletId)))
  );
}

function intersectsWallets(walletIds: readonly number[], affectedWalletIds: Set<number>): boolean {
  return walletIds.some((walletId) => affectedWalletIds.has(walletId));
}

function toDateMs(dateValue: string): number {
  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function periodBoundsMs(startDate: string, endDate: string): { startMs: number; endMs: number } {
  const startMs = toDateMs(startDate);
  let endMs = toDateMs(endDate);
  if (endDate.length === 10) {
    endMs += DAY_MS - 1;
  }
  return { startMs, endMs };
}

function resolveBudgetCategoryNames(
  budget: {
    categoryIds: number[];
    subcategoryIds: number[];
  },
  categoryNameById: Map<number, string>,
  childNamesByParentId: Map<number, string[]>
): Set<string> | null {
  const names = new Set<string>();

  for (const categoryId of budget.categoryIds) {
    const categoryName = categoryNameById.get(categoryId);
    if (categoryName) {
      names.add(categoryName);
    }

    const childNames = childNamesByParentId.get(categoryId);
    if (childNames) {
      for (const childName of childNames) {
        names.add(childName);
      }
    }
  }

  for (const subcategoryId of budget.subcategoryIds) {
    const subcategoryName = categoryNameById.get(subcategoryId);
    if (subcategoryName) {
      names.add(subcategoryName);
    }
  }

  return names.size > 0 ? names : null;
}

async function loadGoalRows(): Promise<Array<GoalRow & { walletIds: number[] }>> {
  const rows = await exec<GoalRow>(
    `SELECT id,
            linked_wallet_ids as linkedWalletIds,
            start_date as startDate,
            target_date as endDate
     FROM goals`
  );

  return rows.map((row) => ({
    ...row,
    walletIds: resolveGoalWalletIds(row),
  }));
}

async function loadBudgetRows(): Promise<Array<BudgetRow & {
  categoryIdsResolved: number[];
  linkedWalletIdsResolved: number[];
  subcategoryIdsResolved: number[];
}>> {
  const rows = await exec<BudgetRow>(
    `SELECT id,
            category_ids as categoryIds,
            subcategory_ids as subcategoryIds,
            end_date as endDate,
            linked_wallet_ids as linkedWalletIds,
            start_date as startDate
     FROM budgets`
  );

  return rows.map((row) => ({
    ...row,
    categoryIdsResolved: resolveBudgetCategoryIds(row),
    linkedWalletIdsResolved: resolveBudgetWalletIds(row),
    subcategoryIdsResolved: resolveBudgetSubcategoryIds(row),
  }));
}

async function buildGoalUpdates(goals: Array<GoalRow & { walletIds: number[] }>): Promise<GoalUpdate[]> {
  const relevantWalletIds = uniqueWalletIds(goals.flatMap((goal) => goal.walletIds));
  if (goals.length === 0 || relevantWalletIds.length === 0) {
    return [];
  }

  // Map for O(1) bound lookup (was Array.find per goal → O(G²))
  const boundById = new Map<number, { startMs: number; endMs: number; walletIdSet: Set<number> }>();
  let rangeStartMs = Infinity;
  let rangeEndMs = -Infinity;
  for (const goal of goals) {
    const { startMs, endMs } = periodBoundsMs(goal.startDate, goal.endDate);
    if (startMs < rangeStartMs) rangeStartMs = startMs;
    if (endMs > rangeEndMs) rangeEndMs = endMs;
    boundById.set(goal.id, { startMs, endMs, walletIdSet: new Set(goal.walletIds) });
  }

  const placeholders = relevantWalletIds.map(() => '?').join(', ');
  const incomeRows = await exec<{ amount: number; date: string; wallet_id: number }>(
    `SELECT t.wallet_id,
            t.date,
            t.amount
     FROM transactions t
     WHERE t.type = 'income'
       AND (t.category IS NULL OR t.category <> 'Transfer')
       AND t.wallet_id IN (${placeholders})
       AND t.date BETWEEN ? AND ?`,
    [
      ...relevantWalletIds,
      new Date(rangeStartMs).toISOString(),
      new Date(rangeEndMs).toISOString(),
    ]
  );

  // Parse each row date ONCE (was re-parsed per goal → G×R `new Date()`)
  const incomeRowMs = new Array<number>(incomeRows.length);
  for (let i = 0; i < incomeRows.length; i++) {
    incomeRowMs[i] = toDateMs(incomeRows[i].date);
  }

  return goals.map((goal) => {
    const bound = boundById.get(goal.id);
    if (!bound) {
      return { currentProgress: 0, id: goal.id };
    }

    // Pre-parsed timestamps (parsed once below) avoid G×R `new Date()` calls
    let currentProgress = 0;
    for (let i = 0; i < incomeRows.length; i++) {
      const row = incomeRows[i];
      if (!bound.walletIdSet.has(row.wallet_id)) continue;
      const rowDateMs = incomeRowMs[i];
      if (rowDateMs < bound.startMs || rowDateMs > bound.endMs) continue;
      currentProgress += row.amount ?? 0;
    }

    return { currentProgress, id: goal.id };
  });
}

async function buildBudgetUpdates(
  budgets: Array<BudgetRow & {
    categoryIdsResolved: number[];
    linkedWalletIdsResolved: number[];
    subcategoryIdsResolved: number[];
  }>
): Promise<BudgetUpdate[]> {
  const relevantWalletIds = uniqueWalletIds(
    budgets.flatMap((budget) => budget.linkedWalletIdsResolved)
  );

  if (budgets.length === 0 || relevantWalletIds.length === 0) {
    return [];
  }

  const categories = await getCategories();
  const categoryNameById = new Map<number, string>();
  const childNamesByParentId = new Map<number, string[]>();

  for (const category of categories) {
    if (category.id == null) {
      continue;
    }

    categoryNameById.set(category.id, category.name);
    if (category.parent_category_id != null) {
      const existingChildren = childNamesByParentId.get(category.parent_category_id) || [];
      existingChildren.push(category.name);
      childNamesByParentId.set(category.parent_category_id, existingChildren);
    }
  }

  const budgetBounds = budgets.map((budget) => ({
    id: budget.id,
    walletIdSet: new Set(budget.linkedWalletIdsResolved),
    allowedCategoryNames: resolveBudgetCategoryNames(
      {
        categoryIds: budget.categoryIdsResolved,
        subcategoryIds: budget.subcategoryIdsResolved,
      },
      categoryNameById,
      childNamesByParentId
    ),
    ...periodBoundsMs(budget.startDate, budget.endDate),
  }));

  let rangeStartMs = Infinity;
  let rangeEndMs = -Infinity;
  for (const bound of budgetBounds) {
    if (bound.startMs < rangeStartMs) rangeStartMs = bound.startMs;
    if (bound.endMs > rangeEndMs) rangeEndMs = bound.endMs;
  }
  const placeholders = relevantWalletIds.map(() => '?').join(', ');
  const expenseRows = await exec<{
    amount: number;
    category: string | null;
    date: string;
    wallet_id: number;
  }>(
    `SELECT t.wallet_id,
            t.category,
            t.date,
            ABS(t.amount * COALESCE(w.exchange_rate, 1.0)) as amount
     FROM transactions t
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense'
       AND (t.category IS NULL OR t.category <> 'Transfer')
       AND t.wallet_id IN (${placeholders})
       AND t.date BETWEEN ? AND ?`,
    [
      ...relevantWalletIds,
      new Date(rangeStartMs).toISOString(),
      new Date(rangeEndMs).toISOString(),
    ]
  );

  // Parse each row date ONCE (was re-parsed per budget → B×R `new Date()`)
  const expenseRowMs = new Array<number>(expenseRows.length);
  for (let i = 0; i < expenseRows.length; i++) {
    expenseRowMs[i] = toDateMs(expenseRows[i].date);
  }

  return budgetBounds.map((bound) => {
    let currentSpending = 0;
    const allowed = bound.allowedCategoryNames;
    for (let i = 0; i < expenseRows.length; i++) {
      const row = expenseRows[i];
      if (!bound.walletIdSet.has(row.wallet_id)) continue;

      const rowDateMs = expenseRowMs[i];
      if (rowDateMs < bound.startMs || rowDateMs > bound.endMs) continue;

      if (allowed && (!row.category || !allowed.has(row.category))) continue;

      currentSpending += row.amount ?? 0;
    }

    return {
      currentSpending,
      id: bound.id,
    };
  });
}

export async function refreshDerivedFinanceStateForWallets(
  walletIds: readonly number[],
  options: RefreshDerivedFinanceStateOptions = {}
): Promise<void> {
  const normalizedWalletIds = uniqueWalletIds(walletIds);
  if (normalizedWalletIds.length === 0) {
    return;
  }

  const includeGoals = options.includeGoals ?? true;
  const includeBudgets = options.includeBudgets ?? true;
  if (!includeGoals && !includeBudgets) {
    return;
  }

  const affectedWalletIds = new Set(normalizedWalletIds);
  const [goalRows, budgetRows] = await Promise.all([
    includeGoals
      ? loadGoalRows()
      : Promise.resolve<Array<GoalRow & { walletIds: number[] }>>([]),
    includeBudgets
      ? loadBudgetRows()
      : Promise.resolve<Array<BudgetRow & {
          categoryIdsResolved: number[];
          linkedWalletIdsResolved: number[];
          subcategoryIdsResolved: number[];
        }>>([]),
  ]);

  const impactedGoals = goalRows.filter((goal) => intersectsWallets(goal.walletIds, affectedWalletIds));
  const impactedBudgets = budgetRows.filter((budget) =>
    intersectsWallets(budget.linkedWalletIdsResolved, affectedWalletIds)
  );

  if (impactedGoals.length === 0 && impactedBudgets.length === 0) {
    return;
  }

  const [goalUpdates, budgetUpdates] = await Promise.all([
    buildGoalUpdates(impactedGoals),
    buildBudgetUpdates(impactedBudgets),
  ]);

  if (goalUpdates.length === 0 && budgetUpdates.length === 0) {
    return;
  }

  await enqueueWrite(async () => {
    const database = await getDbAsync();
    const now = new Date().toISOString();

    await database.transaction(async (tx: TransactionExecutor) => {
      for (const goalUpdate of goalUpdates) {
        await tx.executeAsync(
          'UPDATE goals SET current_progress = ?, updated_at = ? WHERE id = ?',
          [goalUpdate.currentProgress, now, goalUpdate.id]
        );
      }

      for (const budgetUpdate of budgetUpdates) {
        await tx.executeAsync(
          'UPDATE budgets SET current_spending = ?, updated_at = ? WHERE id = ?',
          [budgetUpdate.currentSpending, now, budgetUpdate.id]
        );
      }
    });
  }, 'refresh_derived_finance_state');
}
