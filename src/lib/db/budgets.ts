/**
 * Budgets Database Layer
 * Handles all CRUD operations and spending tracking for budgets
 */

import { Budget, BudgetWithMetrics, BudgetInput } from '@/types/goal';
import { exec, execRun } from '.';

/**
 * Create a new budget
 * @param budget Budget data to create
 * @returns Created budget with ID
 */
export function createBudget(budget: BudgetInput): Budget {
  const now = new Date().toISOString();
  
  const result = execRun(
    `INSERT INTO budgets (name, category_id, subcategory_id, limit_amount, current_spending,
                          period_type, start_date, end_date, notes, linked_wallet_id,
                          created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      budget.name,
      budget.categoryId || null,
      budget.subcategoryId || null,
      budget.limitAmount,
      0,
      budget.periodType,
      budget.startDate,
      budget.endDate,
      budget.notes || null,
      budget.linkedWalletId,
      now,
      now,
    ]
  );

  return {
    ...budget,
    id: result.lastInsertRowId,
    currentSpending: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get all budgets
 * @returns Array of budgets
 */
export function getBudgets(): Budget[] {
  try {
    const budgets = exec<Budget>(
      `SELECT id, name, category_id as categoryId, subcategory_id as subcategoryId,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       ORDER BY created_at DESC`
    );
    return budgets;
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
    return [];
  }
}

/**
 * Get active budgets (within current period)
 * @returns Array of active budgets
 */
export function getActiveBudgets(): Budget[] {
  try {
    const today = new Date().toISOString();
    const budgets = exec<Budget>(
      `SELECT id, name, category_id as categoryId, subcategory_id as subcategoryId,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY end_date ASC`,
      [today, today]
    );
    return budgets;
  } catch (error) {
    console.error('Failed to fetch active budgets:', error);
    return [];
  }
}

/**
 * Get a specific budget by ID
 * @param id Budget ID
 * @returns Budget or null if not found
 */
export function getBudgetById(id: number): Budget | null {
  try {
    const result = exec<Budget>(
      `SELECT id, name, category_id as categoryId, subcategory_id as subcategoryId,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE id = ?`,
      [id]
    );
    return result.length > 0 ? result[0] : null;
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
export function getBudgetWithMetrics(id: number): BudgetWithMetrics | null {
  const budget = getBudgetById(id);
  if (!budget) return null;

  return calculateBudgetMetrics(budget);
}

/**
 * Update a budget
 * @param id Budget ID
 * @param updates Partial budget data to update
 */
export function updateBudget(id: number, updates: Partial<BudgetInput>): void {
  const now = new Date().toISOString();

  // Build dynamic update query
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.categoryId !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.categoryId || null);
  }
  if (updates.subcategoryId !== undefined) {
    fields.push('subcategory_id = ?');
    values.push(updates.subcategoryId || null);
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
  if (updates.linkedWalletId !== undefined) {
    fields.push('linked_wallet_id = ?');
    values.push(updates.linkedWalletId);
    // If wallet changed, recalculate spending
    const budget = getBudgetById(id);
    if (budget && budget.linkedWalletId !== updates.linkedWalletId) {
      fields.push('current_spending = ?');
      values.push(0);
    }
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  execRun(
    `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a budget
 * @param id Budget ID
 */
export function deleteBudget(id: number): void {
  execRun('DELETE FROM budgets WHERE id = ?', [id]);
}

/**
 * Recalculate budget spending based on transactions
 * Call this after creating/updating/deleting transactions
 * @param budgetId Budget ID
 */
export function recalculateBudgetSpending(budgetId: number): void {
  const budget = getBudgetById(budgetId);
  if (!budget) return;

  try {
    // Get category name(s) to filter transactions
    let categoryNames: string[] = [];
    
    if (budget.categoryId) {
      // Get the category and all its subcategories
      const categoryResult = exec<{ name: string }>(
        'SELECT name FROM categories WHERE id = ?',
        [budget.categoryId]
      );
      if (categoryResult.length > 0) {
        categoryNames.push(categoryResult[0].name);
        
        // Also get subcategories
        const subcategories = exec<{ name: string }>(
          'SELECT name FROM categories WHERE parent_category_id = ?',
          [budget.categoryId]
        );
        categoryNames.push(...subcategories.map(s => s.name));
      }
    } else if (budget.subcategoryId) {
      // Just get the specific subcategory
      const subcategoryResult = exec<{ name: string }>(
        'SELECT name FROM categories WHERE id = ?',
        [budget.subcategoryId]
      );
      if (subcategoryResult.length > 0) {
        categoryNames.push(subcategoryResult[0].name);
      }
    }
    
    // Sum all expense transactions matching category, wallet, and period
    let query = `SELECT COALESCE(SUM(ABS(amount)), 0) as total
                 FROM transactions
                 WHERE type = 'expense'
                 AND wallet_id = ?
                 AND date BETWEEN ? AND ?
                 AND category != 'Transfer'`;

    const params: any[] = [budget.linkedWalletId, budget.startDate, budget.endDate];

    // Add category filter if we have category names
    if (categoryNames.length > 0) {
      const placeholders = categoryNames.map(() => '?').join(', ');
      query += ` AND category IN (${placeholders})`;
      params.push(...categoryNames);
    }

    const result = exec<{ total: number }>(query, params);
    const totalSpending = result[0]?.total || 0;

    execRun(
      `UPDATE budgets SET current_spending = ?, updated_at = ? WHERE id = ?`,
      [totalSpending, new Date().toISOString(), budgetId]
    );
  } catch (error) {
    console.error('Failed to recalculate budget spending:', error);
  }
}

/**
 * Get budgets for a specific wallet
 * @param walletId Wallet ID
 * @returns Array of budgets linked to wallet
 */
export function getBudgetsByWallet(walletId: number): Budget[] {
  try {
    const budgets = exec<Budget>(
      `SELECT id, name, category_id as categoryId, subcategory_id as subcategoryId,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE linked_wallet_id = ?
       ORDER BY created_at DESC`,
      [walletId]
    );
    return budgets;
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
export function getBudgetsByCategory(categoryId: number): Budget[] {
  try {
    const budgets = exec<Budget>(
      `SELECT id, name, category_id as categoryId, subcategory_id as subcategoryId,
              limit_amount as limitAmount, current_spending as currentSpending,
              period_type as periodType, start_date as startDate, end_date as endDate,
              notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM budgets
       WHERE category_id = ? OR subcategory_id = ?
       ORDER BY created_at DESC`,
      [categoryId, categoryId]
    );
    return budgets;
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
  const endDate = new Date(budget.endDate);
  const today = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const remainingBalance = budget.limitAmount - budget.currentSpending;
  const percentageUsed = (budget.currentSpending / budget.limitAmount) * 100;
  const isOverBudget = budget.currentSpending > budget.limitAmount;

  // Calculate average daily spend
  const startDate = new Date(budget.startDate);
  const daysElapsed = Math.max(1, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const averageDailySpend = budget.currentSpending / daysElapsed;

  return {
    ...budget,
    remainingBalance,
    percentageUsed: Math.min(percentageUsed, 100),
    isOverBudget,
    daysRemaining: Math.max(0, daysRemaining),
    averageDailySpend,
  };
}

/**
 * Get budgets that are over limit
 * @returns Array of over-budget budgets
 */
export function getOverBudgets(): BudgetWithMetrics[] {
  try {
    const budgets = getActiveBudgets();
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
export function getApproachingLimitBudgets(): BudgetWithMetrics[] {
  try {
    const budgets = getActiveBudgets();
    return budgets
      .map(calculateBudgetMetrics)
      .filter((b) => !b.isOverBudget && b.percentageUsed >= 75)
      .sort((a, b) => b.percentageUsed - a.percentageUsed);
  } catch (error) {
    console.error('Failed to fetch approaching-limit budgets:', error);
    return [];
  }
}
