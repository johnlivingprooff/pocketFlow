/**
 * Budgets Database Layer
 * Handles all CRUD operations and spending tracking for budgets
 */

import { Budget, BudgetWithMetrics, BudgetInput } from '@/types/goal';
import { execRun, exec, getDbAsync } from '.';
import { enqueueWrite } from './writeQueue';
import { haveSameNumberMembers } from './idLists';
import {
  BUDGET_SELECT_FIELDS,
  BudgetRow,
  mapBudgetRow,
} from './goalBudgetRows';
import { refreshDerivedFinanceStateForWallets } from './derivedState';

type TransactionExecutor = {
  executeAsync: (sql: string, params?: unknown[]) => Promise<{
    rows?: {
      _array?: Array<{ id: number }>;
    };
  }>;
};

let recurringBudgetEnsurePromise: Promise<void> | null = null;

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const targetMonth = next.getMonth() + months;
  next.setMonth(targetMonth);
  return next;
}

async function ensureRecurringBudgets(): Promise<void> {
  if (recurringBudgetEnsurePromise) {
    return recurringBudgetEnsurePromise;
  }

  recurringBudgetEnsurePromise = ensureRecurringBudgetsInternal().finally(() => {
    recurringBudgetEnsurePromise = null;
  });

  return recurringBudgetEnsurePromise;
}

async function ensureRecurringBudgetsInternal(): Promise<void> {
  const today = new Date();

  const recurringBudgets = await exec<BudgetRow>(
    `SELECT ${BUDGET_SELECT_FIELDS}
     FROM budgets
     WHERE is_recurring = 1`
  );

  const dueBudgets = recurringBudgets
    .map(mapBudgetRow)
    .filter((budget) =>
      budget.id != null && new Date(budget.endDate).getTime() < today.getTime()
    );

  if (dueBudgets.length === 0) {
    return;
  }

  const affectedWalletIds = new Set<number>();
  for (const budget of dueBudgets) {
    for (const walletId of budget.linkedWalletIds) {
      affectedWalletIds.add(walletId);
    }
  }

  await enqueueWrite(async () => {
    const database = await getDbAsync();

    await database.transaction(async (tx: TransactionExecutor) => {
      for (const budget of dueBudgets) {
        if (budget.id == null) {
          continue;
        }

        let current = budget;
        let currentBudgetId = budget.id;
        const recurrenceParentId = budget.recurrenceParentId ?? budget.id;
        let safetyCounter = 0;

        while (new Date(current.endDate).getTime() < today.getTime()) {
          const start = new Date(current.startDate);
          const end = new Date(current.endDate);
          const durationDays = Math.max(
            1,
            Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
          );

          let nextStart: Date;
          let nextEnd: Date;

          if (current.periodType === 'weekly') {
            nextStart = addDays(start, 7);
            nextEnd = addDays(end, 7);
          } else if (current.periodType === 'monthly') {
            nextStart = addMonths(start, 1);
            nextEnd = addMonths(end, 1);
          } else {
            nextStart = addDays(start, durationDays);
            nextEnd = addDays(end, durationDays);
          }

          const nowIso = new Date().toISOString();

          if (current.recurrenceEndDate) {
            const recurrenceEndDate = new Date(current.recurrenceEndDate);
            if (nextStart.getTime() > recurrenceEndDate.getTime()) {
              await tx.executeAsync(
                `UPDATE budgets SET is_recurring = 0, updated_at = ? WHERE id = ?`,
                [nowIso, currentBudgetId]
              );
              break;
            }
          }

          const nextStartStr = toDateOnly(nextStart);
          const nextEndStr = toDateOnly(nextEnd);

          await tx.executeAsync(
            `UPDATE budgets SET is_recurring = 0, updated_at = ? WHERE id = ?`,
            [nowIso, currentBudgetId]
          );

          await tx.executeAsync(
            `INSERT INTO budgets (name, category_ids, subcategory_ids, limit_amount, current_spending,
                                  period_type, start_date, end_date, notes, linked_wallet_ids,
                                  is_recurring, recurrence_end_date, recurrence_parent_id,
                                  created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              current.name,
              JSON.stringify(current.categoryIds),
              JSON.stringify(current.subcategoryIds || []),
              current.limitAmount,
              0,
              current.periodType,
              nextStartStr,
              nextEndStr,
              current.notes || null,
              JSON.stringify(current.linkedWalletIds),
              1,
              current.recurrenceEndDate || null,
              recurrenceParentId,
              nowIso,
              nowIso,
            ]
          );

          const inserted = await tx.executeAsync('SELECT last_insert_rowid() as id');
          const nextBudgetId = inserted.rows?._array?.[0]?.id;
          if (nextBudgetId == null) {
            break;
          }

          currentBudgetId = nextBudgetId;
          current = {
            ...current,
            id: nextBudgetId,
            startDate: nextStartStr,
            endDate: nextEndStr,
            currentSpending: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
            isRecurring: true,
            recurrenceParentId,
          };

          safetyCounter += 1;
          if (safetyCounter > 24) {
            break;
          }
        }
      }
    });
  }, 'ensureRecurringBudgets');

  if (affectedWalletIds.size > 0) {
    await refreshDerivedFinanceStateForWallets(Array.from(affectedWalletIds), {
      includeBudgets: true,
      includeGoals: false,
    });
  }
}

/**
 * Create a new budget
 * @param budget Budget data to create
 * @returns Created budget with ID
 */
export async function createBudget(budget: BudgetInput): Promise<Budget> {
  const now = new Date().toISOString();
  const isRecurring = Boolean(budget.isRecurring);
  const recurrenceEndDate = budget.recurrenceEndDate ?? null;
  const recurrenceParentId = budget.recurrenceParentId ?? null;
  let createdBudgetId: number | undefined;
  const createdBudget: Budget = {
    ...budget,
    currentSpending: 0,
    createdAt: now,
    updatedAt: now,
    isRecurring,
    recurrenceEndDate,
    recurrenceParentId,
  };

  await enqueueWrite(async () => {
    const result = await execRun(
      `INSERT INTO budgets (name, category_ids, subcategory_ids, limit_amount, current_spending,
                            period_type, start_date, end_date, notes, linked_wallet_ids,
                            is_recurring, recurrence_end_date, recurrence_parent_id,
                            created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.name,
        JSON.stringify(budget.categoryIds),
        JSON.stringify(budget.subcategoryIds || []),
        budget.limitAmount,
        0,
        budget.periodType,
        budget.startDate,
        budget.endDate,
        budget.notes || null,
        JSON.stringify(budget.linkedWalletIds),
        isRecurring ? 1 : 0,
        recurrenceEndDate,
        recurrenceParentId,
        now,
        now,
      ]
    );
    createdBudgetId = typeof result?.lastInsertRowId === 'number' ? result.lastInsertRowId : undefined;
  }, 'createBudget');

  if (createdBudgetId != null) {
    await recalculateBudgetSpending(createdBudgetId);
  }

  return {
    ...createdBudget,
    id: createdBudgetId,
  };
}

/**
 * Get all budgets
 * @returns Array of budgets
 */
export async function getBudgets(): Promise<Budget[]> {
  try {
    await ensureRecurringBudgets();
    const rawBudgets = await exec<BudgetRow>(
      `SELECT ${BUDGET_SELECT_FIELDS}
       FROM budgets
       ORDER BY created_at DESC`
    );
    
    return rawBudgets.map(mapBudgetRow);
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
    return [];
  }
}

/**
 * Get active budgets (within current period)
 * @returns Array of active budgets
 */
export async function getActiveBudgets(): Promise<Budget[]> {
  try {
    await ensureRecurringBudgets();
    const today = new Date().toISOString();
    const rawBudgets = await exec<BudgetRow>(
      `SELECT ${BUDGET_SELECT_FIELDS}
       FROM budgets
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY end_date ASC`,
      [today, today]
    );
    
    return rawBudgets.map(mapBudgetRow);
  } catch (error) {
    console.error('Failed to fetch active budgets:', error);
    return [];
  }
}

/**
 * Get budgets for a specific time period
 * Filters budgets based on when they were created within the given date range
 * @param days Number of days back from today
 * @returns Array of budgets created within the period
 */
export async function getBudgetsForPeriod(days: number): Promise<Budget[]> {
  try {
    await ensureRecurringBudgets();
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    
    const start = startDate.toISOString();
    const end = now.toISOString();
    
    const rawBudgets = await exec<BudgetRow>(
      `SELECT ${BUDGET_SELECT_FIELDS}
       FROM budgets
       WHERE created_at BETWEEN ? AND ?
       ORDER BY created_at DESC`,
      [start, end]
    );
    
    return rawBudgets.map(mapBudgetRow);
  } catch (error) {
    console.error('Failed to fetch budgets for period:', error);
    return [];
  }
}

/**
 * Get a specific budget by ID
 * @param id Budget ID
 * @returns Budget or null if not found
 */
export async function getBudgetById(id: number): Promise<Budget | null> {
  try {
    const result = await exec<BudgetRow>(
      `SELECT ${BUDGET_SELECT_FIELDS}
       FROM budgets
       WHERE id = ?`,
      [id]
    );
    
    return result[0] ? mapBudgetRow(result[0]) : null;
  } catch (error) {
    console.error('Failed to fetch budget:', error);
    return null;
  }
}

/**
 * Get budget with calculated metrics
 * @param id Budget ID
 * @returns Budget with metrics or null
 */
export async function getBudgetWithMetrics(id: number): Promise<BudgetWithMetrics | null> {
  const budget = await getBudgetById(id);
  if (!budget) return null;

  return calculateBudgetMetrics(budget);
}

/**
 * Update a budget
 * @param id Budget ID
 * @param updates Partial budget data to update
 */
export async function updateBudget(id: number, updates: Partial<BudgetInput>): Promise<void> {
  const now = new Date().toISOString();

  // Build dynamic update query
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.categoryIds !== undefined) {
    fields.push('category_ids = ?');
    values.push(JSON.stringify(updates.categoryIds));
  }
  if (updates.subcategoryIds !== undefined) {
    fields.push('subcategory_ids = ?');
    values.push(JSON.stringify(updates.subcategoryIds));
  }
  if (updates.limitAmount !== undefined) {
    fields.push('limit_amount = ?');
    values.push(updates.limitAmount);
  }
  if (updates.periodType !== undefined) {
    fields.push('period_type = ?');
    values.push(updates.periodType);
  }
  if (updates.startDate !== undefined) {
    fields.push('start_date = ?');
    values.push(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    fields.push('end_date = ?');
    values.push(updates.endDate);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes || null);
  }
  if (updates.linkedWalletIds !== undefined) {
    fields.push('linked_wallet_ids = ?');
    values.push(JSON.stringify(updates.linkedWalletIds));
    // If wallets changed, recalculate spending
    const budget = await getBudgetById(id);
    if (budget && !haveSameNumberMembers(budget.linkedWalletIds, updates.linkedWalletIds)) {
      fields.push('current_spending = ?');
      values.push(0);
    }
  }
  if (updates.isRecurring !== undefined) {
    fields.push('is_recurring = ?');
    values.push(updates.isRecurring ? 1 : 0);
  }
  if (updates.recurrenceEndDate !== undefined) {
    fields.push('recurrence_end_date = ?');
    values.push(updates.recurrenceEndDate || null);
  }
  if (updates.recurrenceParentId !== undefined) {
    fields.push('recurrence_parent_id = ?');
    values.push(updates.recurrenceParentId ?? null);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await enqueueWrite(async () => {
    await execRun(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }, 'updateBudget');

  await recalculateBudgetSpending(id);
}

/**
 * Delete a budget
 * @param id Budget ID
 */
export async function deleteBudget(id: number): Promise<void> {
  await enqueueWrite(async () => {
    await execRun('DELETE FROM budgets WHERE id = ?', [id]);
  }, 'deleteBudget');
}

/**
 * Recalculate budget spending based on transactions
 * Call this after creating/updating/deleting transactions
 * @param budgetId Budget ID
 */
export async function recalculateBudgetSpending(budgetId: number): Promise<void> {
  const budget = await getBudgetById(budgetId);
  if (!budget) return;

  try {
    if (budget.linkedWalletIds.length === 0) {
      await enqueueWrite(async () => {
        await execRun(
          `UPDATE budgets SET current_spending = ?, updated_at = ? WHERE id = ?`,
          [0, new Date().toISOString(), budgetId]
        );
      }, 'recalculateBudgetSpending');
      return;
    }

    await refreshDerivedFinanceStateForWallets(budget.linkedWalletIds, {
      includeBudgets: true,
      includeGoals: false,
    });
  } catch (error) {
    console.error('Failed to recalculate budget spending:', error);
  }
}

/**
 * Get budgets for a specific wallet
 * @param walletId Wallet ID
 * @returns Array of budgets linked to wallet
 */
export async function getBudgetsByWallet(walletId: number): Promise<Budget[]> {
  try {
    const rawBudgets = await exec<BudgetRow>(
      `SELECT ${BUDGET_SELECT_FIELDS}
       FROM budgets
       ORDER BY created_at DESC`,
      []
    );

    return rawBudgets
      .map(mapBudgetRow)
      .filter((budget) => budget.linkedWalletIds.includes(walletId));
  } catch (error) {
    console.error('Failed to fetch budgets by wallet:', error);
    return [];
  }
}

/**
 * Get budgets for a specific category
 * @param categoryId Category ID
 * @returns Array of budgets for category
 */
export async function getBudgetsByCategory(categoryId: number): Promise<Budget[]> {
  try {
    const rawBudgets = await exec<BudgetRow>(
      `SELECT ${BUDGET_SELECT_FIELDS}
       FROM budgets
       ORDER BY created_at DESC`,
      []
    );

    return rawBudgets
      .map(mapBudgetRow)
      .filter((budget) =>
        budget.categoryIds.includes(categoryId) || (budget.subcategoryIds ?? []).includes(categoryId)
      );
  } catch (error) {
    console.error('Failed to fetch budgets by category:', error);
    return [];
  }
}

/**
 * Calculate display metrics for a budget
 * @param budget Budget object
 * @returns Budget with calculated metrics
 */
export function calculateBudgetMetrics(budget: Budget): BudgetWithMetrics {
  const startDate = new Date(budget.startDate);
  const endDate = new Date(budget.endDate);
  const today = new Date();

  // Calculate days remaining (can be negative for past budgets)
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate days elapsed since budget start (capped at budget duration for past budgets)
  const actualDaysElapsed = Math.max(0, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const budgetDurationDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // For metrics calculation, use the appropriate time period
  let relevantDaysElapsed: number;
  if (today < startDate) {
    // Future budget - no spending yet
    relevantDaysElapsed = 0;
  } else if (today > endDate) {
    // Past budget - use full budget duration
    relevantDaysElapsed = budgetDurationDays;
  } else {
    // Current budget - use days since start
    relevantDaysElapsed = actualDaysElapsed;
  }

  const averageDailySpend = relevantDaysElapsed > 0 ? budget.currentSpending / relevantDaysElapsed : 0;

  const remainingBalance = budget.limitAmount - budget.currentSpending;
  const percentageUsed = budget.limitAmount > 0 ? (budget.currentSpending / budget.limitAmount) * 100 : 0;
  const isOverBudget = budget.currentSpending > budget.limitAmount;

  return {
    ...budget,
    remainingBalance,
    percentageUsed: Math.min(percentageUsed, 100),
    isOverBudget,
    daysRemaining,
    averageDailySpend,
  };
}

/**
 * Get budgets that are over limit
 * @returns Array of over-budget budgets
 */
export async function getOverBudgets(): Promise<BudgetWithMetrics[]> {
  try {
    const budgets = await getActiveBudgets();
    return budgets
      .map(calculateBudgetMetrics)
      .filter((b) => b.isOverBudget)
      .sort((a, b) => b.percentageUsed - a.percentageUsed);
  } catch (error) {
    console.error('Failed to fetch over-budget items:', error);
    return [];
  }
}

/**
 * Get budgets approaching limit (>75%)
 * @returns Array of approaching-limit budgets
 */
export async function getApproachingLimitBudgets(): Promise<BudgetWithMetrics[]> {
  try {
    const budgets = await getActiveBudgets();
    return budgets
      .map(calculateBudgetMetrics)
      .filter((b) => !b.isOverBudget && b.percentageUsed >= 75)
      .sort((a, b) => b.percentageUsed - a.percentageUsed);
  } catch (error) {
    console.error('Failed to fetch approaching-limit budgets:', error);
    return [];
  }
}
