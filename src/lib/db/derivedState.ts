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
    `SELECT id, linked_wallet_ids as linkedWalletIds
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

  const placeholders = relevantWalletIds.map(() => '?').join(', ');
  const incomeRows = await exec<{ total: number; wallet_id: number }>(
    `SELECT wallet_id, COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE type = 'income'
       AND (category IS NULL OR category <> 'Transfer')
       AND wallet_id IN (${placeholders})
     GROUP BY wallet_id`,
    relevantWalletIds
  );

  const incomeByWalletId = new Map<number, number>(
    incomeRows.map((row) => [row.wallet_id, row.total ?? 0])
  );

  return goals.map((goal) => ({
    currentProgress: goal.walletIds.reduce(
      (sum, walletId) => sum + (incomeByWalletId.get(walletId) ?? 0),
      0
    ),
    id: goal.id,
  }));
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

  const rangeStartMs = Math.min(...budgets.map((budget) => toDateMs(budget.startDate)));
  const rangeEndMs = Math.max(...budgets.map((budget) => toDateMs(budget.endDate)));
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

  return budgets.map((budget) => {
    const walletIdSet = new Set(budget.linkedWalletIdsResolved);
    const allowedCategoryNames = resolveBudgetCategoryNames(
      {
        categoryIds: budget.categoryIdsResolved,
        subcategoryIds: budget.subcategoryIdsResolved,
      },
      categoryNameById,
      childNamesByParentId
    );
    const startMs = toDateMs(budget.startDate);
    const endMs = toDateMs(budget.endDate);

    const currentSpending = expenseRows.reduce((sum, row) => {
      if (!walletIdSet.has(row.wallet_id)) {
        return sum;
      }

      const rowDateMs = toDateMs(row.date);
      if (rowDateMs < startMs || rowDateMs > endMs) {
        return sum;
      }

      if (allowedCategoryNames && (!row.category || !allowedCategoryNames.has(row.category))) {
        return sum;
      }

      return sum + (row.amount ?? 0);
    }, 0);

    return {
      currentSpending,
      id: budget.id,
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
