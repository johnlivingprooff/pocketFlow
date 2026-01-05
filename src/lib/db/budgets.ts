/**
 * Budgets Database Layer
 * Handles all CRUD operations and spending tracking for budgets
 */

import { Budget, BudgetWithMetrics, BudgetInput } from '@/types/goal';
import { execRun, exec } from '.';
import { enqueueWrite } from './writeQueue';

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
  const today = new Date();

  const recurringBudgets = await exec<{
    id: number;
    name: string;
    categoryIds: string;
    subcategoryIds: string;
    limitAmount: number;
    currentSpending: number;
    periodType: string;
    startDate: string;
    endDate: string;
    notes: string | null;
    linkedWalletIds: string;
    isRecurring: number;
    recurrenceEndDate: string | null;
    recurrenceParentId: number | null;
    createdAt: string;
    updatedAt: string;
  }>(
    `SELECT id, name, category_ids as categoryIds, subcategory_ids as subcategoryIds,
            limit_amount as limitAmount, current_spending as currentSpending,
            period_type as periodType, start_date as startDate, end_date as endDate,
            notes, linked_wallet_ids as linkedWalletIds,
            is_recurring as isRecurring, recurrence_end_date as recurrenceEndDate, recurrence_parent_id as recurrenceParentId,
            created_at as createdAt, updated_at as updatedAt
     FROM budgets
     WHERE is_recurring = 1`
  );

  for (const budget of recurringBudgets) {
    let current: Budget = {
      ...budget,
      categoryIds: JSON.parse(budget.categoryIds),
      subcategoryIds: JSON.parse(budget.subcategoryIds),
      linkedWalletIds: JSON.parse(budget.linkedWalletIds),
      periodType: budget.periodType as 'weekly' | 'monthly' | 'custom',
      notes: budget.notes || undefined,
      isRecurring: Boolean(budget.isRecurring),
      recurrenceEndDate: budget.recurrenceEndDate || undefined,
      recurrenceParentId: budget.recurrenceParentId ?? undefined,
    };

    let safetyCounter = 0;
    while (new Date(current.endDate).getTime() < today.getTime()) {
      const start = new Date(current.startDate);
      const end = new Date(current.endDate);
      const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

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

      if (current.recurrenceEndDate) {
        const recurEnd = new Date(current.recurrenceEndDate);
        if (nextStart.getTime() > recurEnd.getTime()) {
          break;
        }
      }

      const nowIso = new Date().toISOString();
      const nextStartStr = toDateOnly(nextStart);
      const nextEndStr = toDateOnly(nextEnd);
      const recurrenceParentId = current.recurrenceParentId ?? current.id;
      let nextBudgetId: number | undefined;

      await enqueueWrite(async () => {
        await execRun(
          `UPDATE budgets SET is_recurring = 0, updated_at = ? WHERE id = ?`,
          [nowIso, current.id]
        );

        await execRun(
          `INSERT INTO budgets (name, category_id, subcategory_id, category_ids, subcategory_ids, limit_amount, current_spending,
                                period_type, start_date, end_date, notes, linked_wallet_ids,
                                is_recurring, recurrence_end_date, recurrence_parent_id,
                                created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            current.name,
            null,
            null,
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
            recurrenceParentId ?? null,
            nowIso,
            nowIso,
          ]
        );

        const inserted = await exec<{ id: number }>('SELECT last_insert_rowid() as id;');
        nextBudgetId = inserted[0]?.id;
      }, 'rolloverRecurringBudget');

      if (!nextBudgetId) {
        break;
      }

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
        // Prevent runaway loops in case of unexpected data issues
        break;
      }
    }
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
    await execRun(
      `INSERT INTO budgets (name, category_id, subcategory_id, category_ids, subcategory_ids, limit_amount, current_spending,
                            period_type, start_date, end_date, notes, linked_wallet_ids,
                            is_recurring, recurrence_end_date, recurrence_parent_id,
                            created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.name,
        null, // category_id (old single column, now null)
        null, // subcategory_id (old single column, now null)
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
  }, 'createBudget');

  return createdBudget;
}

/**
 * Get all budgets
 * @returns Array of budgets
 */
export async function getBudgets(): Promise<Budget[]> {
  try {
    await ensureRecurringBudgets();
    const rawBudgets = await exec<{
      id: number;
      name: string;
      categoryIds: string;
      subcategoryIds: string;
      limitAmount: number;
      currentSpending: number;
      periodType: string;
      startDate: string;
      endDate: string;
      notes: string | null;
      linkedWalletIds: string;
      isRecurring: number;
      recurrenceEndDate: string | null;
      recurrenceParentId: number | null;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT id, name, category_ids as categoryIds, subcategory_ids as subcategoryIds,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_ids as linkedWalletIds,
              is_recurring as isRecurring, recurrence_end_date as recurrenceEndDate, recurrence_parent_id as recurrenceParentId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       ORDER BY created_at DESC`
    );
    
    return rawBudgets.map(budget => ({
      ...budget,
      categoryIds: JSON.parse(budget.categoryIds),
      subcategoryIds: JSON.parse(budget.subcategoryIds),
      linkedWalletIds: JSON.parse(budget.linkedWalletIds),
      periodType: budget.periodType as 'weekly' | 'monthly' | 'custom',
      notes: budget.notes || undefined,
      isRecurring: Boolean(budget.isRecurring),
      recurrenceEndDate: budget.recurrenceEndDate || undefined,
      recurrenceParentId: budget.recurrenceParentId ?? undefined,
    }));
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
    const rawBudgets = await exec<{
      id: number;
      name: string;
      categoryIds: string;
      subcategoryIds: string;
      limitAmount: number;
      currentSpending: number;
      periodType: string;
      startDate: string;
      endDate: string;
      notes: string | null;
      linkedWalletIds: string;
      isRecurring: number;
      recurrenceEndDate: string | null;
      recurrenceParentId: number | null;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT id, name, category_ids as categoryIds, subcategory_ids as subcategoryIds,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_ids as linkedWalletIds,
              is_recurring as isRecurring, recurrence_end_date as recurrenceEndDate, recurrence_parent_id as recurrenceParentId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY end_date ASC`,
      [today, today]
    );
    
    return rawBudgets.map(budget => ({
      ...budget,
      categoryIds: JSON.parse(budget.categoryIds),
      subcategoryIds: JSON.parse(budget.subcategoryIds),
      linkedWalletIds: JSON.parse(budget.linkedWalletIds),
      periodType: budget.periodType as 'weekly' | 'monthly' | 'custom',
      notes: budget.notes || undefined,
      isRecurring: Boolean(budget.isRecurring),
      recurrenceEndDate: budget.recurrenceEndDate || undefined,
      recurrenceParentId: budget.recurrenceParentId ?? undefined,
    }));
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
    
    const rawBudgets = await exec<{
      id: number;
      name: string;
      categoryIds: string;
      subcategoryIds: string;
      limitAmount: number;
      currentSpending: number;
      periodType: string;
      startDate: string;
      endDate: string;
      notes: string | null;
      linkedWalletIds: string;
      isRecurring: number;
      recurrenceEndDate: string | null;
      recurrenceParentId: number | null;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT id, name, category_ids as categoryIds, subcategory_ids as subcategoryIds,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_ids as linkedWalletIds,
              is_recurring as isRecurring, recurrence_end_date as recurrenceEndDate, recurrence_parent_id as recurrenceParentId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE created_at BETWEEN ? AND ?
       ORDER BY created_at DESC`,
      [start, end]
    );
    
    return rawBudgets.map(budget => ({
      ...budget,
      categoryIds: JSON.parse(budget.categoryIds),
      subcategoryIds: JSON.parse(budget.subcategoryIds),
      linkedWalletIds: JSON.parse(budget.linkedWalletIds),
      periodType: budget.periodType as 'weekly' | 'monthly' | 'custom',
      notes: budget.notes || undefined,
      isRecurring: Boolean(budget.isRecurring),
      recurrenceEndDate: budget.recurrenceEndDate || undefined,
      recurrenceParentId: budget.recurrenceParentId ?? undefined,
    }));
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
    const result = await exec<{
      id: number;
      name: string;
      categoryIds: string;
      subcategoryIds: string;
      limitAmount: number;
      currentSpending: number;
      periodType: string;
      startDate: string;
      endDate: string;
      notes: string | null;
      linkedWalletIds: string;
      isRecurring: number;
      recurrenceEndDate: string | null;
      recurrenceParentId: number | null;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT id, name, category_ids as categoryIds, subcategory_ids as subcategoryIds,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_ids as linkedWalletIds,
              is_recurring as isRecurring, recurrence_end_date as recurrenceEndDate, recurrence_parent_id as recurrenceParentId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE id = ?`,
      [id]
    );
    
    if (result.length > 0) {
      const budget = result[0];
      return {
        ...budget,
        categoryIds: JSON.parse(budget.categoryIds),
        subcategoryIds: JSON.parse(budget.subcategoryIds),
        linkedWalletIds: JSON.parse(budget.linkedWalletIds),
        periodType: budget.periodType as 'weekly' | 'monthly' | 'custom',
        notes: budget.notes || undefined,
        isRecurring: Boolean(budget.isRecurring),
        recurrenceEndDate: budget.recurrenceEndDate || undefined,
        recurrenceParentId: budget.recurrenceParentId ?? undefined,
      };
    }
    return null;
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
    if (budget && JSON.stringify(budget.linkedWalletIds.sort()) !== JSON.stringify(updates.linkedWalletIds.sort())) {
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
    // Get all linked wallets for exchange rates
    const linkedWalletIds = budget.linkedWalletIds;
    if (linkedWalletIds.length === 0) return;

    // Get category name(s) to filter transactions
    let categoryNames: string[] = [];

    if (budget.categoryIds && budget.categoryIds.length > 0) {
      // Get all selected categories and their subcategories
      for (const categoryId of budget.categoryIds) {
        const categoryResult = await exec<{ name: string }>(
          'SELECT name FROM categories WHERE id = ?',
          [categoryId]
        );
        if (categoryResult.length > 0) {
          categoryNames.push(categoryResult[0].name);

          // Also get subcategories
          const subcategories = await exec<{ name: string }>(
            'SELECT name FROM categories WHERE parent_category_id = ?',
            [categoryId]
          );
          categoryNames.push(...subcategories.map(s => s.name));
        }
      }
    }

    // Sum all expense transactions across all linked wallets
    // Convert amounts to default currency using each wallet's exchange rate
    let totalSpending = 0;

    for (const walletId of linkedWalletIds) {
      // Get wallet exchange rate for currency conversion
      const walletResult = await exec<{ exchange_rate: number }>(
        'SELECT exchange_rate FROM wallets WHERE id = ?',
        [walletId]
      );
      const exchangeRate = walletResult[0]?.exchange_rate || 1.0;

      let query = `SELECT COALESCE(SUM(ABS(amount) * ?), 0) as total
                   FROM transactions
                   WHERE type = 'expense'
                   AND wallet_id = ?
                   AND date BETWEEN ? AND ?
                   AND category != 'Transfer'`;

      const params: any[] = [exchangeRate, walletId, budget.startDate, budget.endDate];

      // Add category filter if we have category names
      if (categoryNames.length > 0) {
        const placeholders = categoryNames.map(() => '?').join(', ');
        query += ` AND category IN (${placeholders})`;
        params.push(...categoryNames);
      }

      const result = await exec<{ total: number }>(query, params);
      totalSpending += result[0]?.total || 0;
    }

    await enqueueWrite(async () => {
      await execRun(
        `UPDATE budgets SET current_spending = ?, updated_at = ? WHERE id = ?`,
        [totalSpending, new Date().toISOString(), budgetId]
      );
    }, 'recalculateBudgetSpending');
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
    const rawBudgets = await exec<{
      id: number;
      name: string;
      categoryIds: string;
      subcategoryIds: string;
      limitAmount: number;
      currentSpending: number;
      periodType: string;
      startDate: string;
      endDate: string;
      notes: string | null;
      linkedWalletIds: string;
      isRecurring: number;
      recurrenceEndDate: string | null;
      recurrenceParentId: number | null;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT id, name, category_ids as categoryIds, subcategory_ids as subcategoryIds,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_ids as linkedWalletIds,
              is_recurring as isRecurring, recurrence_end_date as recurrenceEndDate, recurrence_parent_id as recurrenceParentId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE linked_wallet_id = ? OR json_extract(linked_wallet_ids, '$') LIKE ?
       ORDER BY created_at DESC`,
      [walletId, `%${walletId}%`]
    );

    return rawBudgets.map(budget => ({
      ...budget,
      categoryIds: JSON.parse(budget.categoryIds),
      subcategoryIds: JSON.parse(budget.subcategoryIds),
      linkedWalletIds: JSON.parse(budget.linkedWalletIds),
      periodType: budget.periodType as 'weekly' | 'monthly' | 'custom',
      notes: budget.notes || undefined,
      isRecurring: Boolean(budget.isRecurring),
      recurrenceEndDate: budget.recurrenceEndDate || undefined,
      recurrenceParentId: budget.recurrenceParentId ?? undefined,
    }));
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
    const rawBudgets = await exec<{
      id: number;
      name: string;
      categoryIds: string;
      subcategoryIds: string;
      limitAmount: number;
      currentSpending: number;
      periodType: string;
      startDate: string;
      endDate: string;
      notes: string | null;
      linkedWalletIds: string;
      isRecurring: number;
      recurrenceEndDate: string | null;
      recurrenceParentId: number | null;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT id, name, category_ids as categoryIds, subcategory_ids as subcategoryIds,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_ids as linkedWalletIds,
              is_recurring as isRecurring, recurrence_end_date as recurrenceEndDate, recurrence_parent_id as recurrenceParentId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE category_id = ? OR subcategory_id = ? OR
             json_extract(category_ids, '$') LIKE ? OR
             json_extract(subcategory_ids, '$') LIKE ?
       ORDER BY created_at DESC`,
      [categoryId, categoryId, `%${categoryId}%`, `%${categoryId}%`]
    );

    return rawBudgets.map(budget => ({
      ...budget,
      categoryIds: JSON.parse(budget.categoryIds),
      subcategoryIds: JSON.parse(budget.subcategoryIds),
      linkedWalletIds: JSON.parse(budget.linkedWalletIds),
      periodType: budget.periodType as 'weekly' | 'monthly' | 'custom',
      notes: budget.notes || undefined,
      isRecurring: Boolean(budget.isRecurring),
      recurrenceEndDate: budget.recurrenceEndDate || undefined,
      recurrenceParentId: budget.recurrenceParentId ?? undefined,
    }));
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
