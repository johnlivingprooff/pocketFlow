import type { Goal, GoalWithMetrics, GoalInput } from '../../types/goal';
import { getDb } from './index';
import { error as logError } from '../../utils/logger';

// Helper to map DB row to Goal type
function mapGoalRow(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentProgress: row.current_progress,
    targetDate: row.target_date,
    notes: row.notes ?? undefined,
    linkedWalletId: row.linked_wallet_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Get all goals in the database
export function getGoals(): Goal[] {
  try {
    const db = getDb();
    const result = db.execute('SELECT * FROM goals ORDER BY target_date ASC');
    return (result.rows?._array ?? []).map(mapGoalRow);
  } catch (error) {
    logError('Failed to fetch all goals:', { error });
    return [];
  }
}

// Calculate display metrics for a goal
export function calculateGoalMetrics(goal: Goal): GoalWithMetrics {
  const targetDate = new Date(goal.targetDate);
  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercentage = Math.min(100, (goal.currentProgress / goal.targetAmount) * 100);
  const monthsRemaining = Math.max(1, daysRemaining / 30);
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentProgress);
  const monthlyRequired = remainingAmount / monthsRemaining;
  const onTrack = daysRemaining > 0 && remainingAmount <= monthlyRequired * monthsRemaining;
  return {
    ...goal,
    progressPercentage,
    daysRemaining: Math.max(0, daysRemaining),
    monthlyRequired,
    onTrack,
  };
}

export function createGoal(goal: GoalInput): Goal {
  const db = getDb();
  const now = new Date().toISOString();
  db.execute(
    `INSERT INTO goals (name, target_amount, current_progress, target_date, notes, linked_wallet_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.name,
      goal.targetAmount,
      0,
      goal.targetDate,
      goal.notes || null,
      goal.linkedWalletId,
      now,
      now,
    ]
  );
  return {
    ...goal,
    currentProgress: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function getGoalById(id: number): Goal | null {
  try {
    const db = getDb();
    const result = db.execute(
      `SELECT * FROM goals WHERE id = ?`,
      [id]
    );
    const row = result.rows?._array?.[0];
    return row ? mapGoalRow(row) : null;
  } catch (error) {
    logError('Failed to fetch goal:', { error });
    return null;
  }
}

/**
 * Get goal with calculated metrics
 * @param id Goal ID
 * @returns Goal with metrics or null
 */
export function getGoalWithMetrics(id: number): GoalWithMetrics | null {
  const goal = getGoalById(id);
  if (!goal) return null;
  return calculateGoalMetrics(goal);
}

/**
 * Update a goal
 * @param id Goal ID
 * @param updates Partial goal data to update
 */
export function updateGoal(id: number, updates: Partial<GoalInput>): void {
  const db = getDb();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.targetAmount !== undefined) {
    fields.push('target_amount = ?');
    values.push(updates.targetAmount);
  }
  if (updates.targetDate !== undefined) {
    fields.push('target_date = ?');
    values.push(updates.targetDate);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes || null);
  }
  if (updates.linkedWalletId !== undefined) {
    fields.push('linked_wallet_id = ?');
    values.push(updates.linkedWalletId);
    const goal = getGoalById(id);
    if (goal && goal.linkedWalletId !== updates.linkedWalletId) {
      fields.push('current_progress = ?');
      values.push(0);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  db.execute(
    `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}


/**
 * Delete a goal
 * @param id Goal ID
 */
export function deleteGoal(id: number): void {
  const db = getDb();
  db.execute('DELETE FROM goals WHERE id = ?', [id]);
}

/**
 * Update goal progress based on wallet income
 * Call this after creating/updating/deleting transactions
 * @param goalId Goal ID
 */
export function recalculateGoalProgress(goalId: number): void {
  const db = getDb();
  const goal = getGoalById(goalId);
  if (!goal) return;
  try {
    const result = db.execute(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE wallet_id = ? AND type = 'income' AND category != 'Transfer'`,
      [goal.linkedWalletId]
    );
    const totalIncome = result.rows?._array?.[0]?.total || 0;
    db.execute(
      `UPDATE goals SET current_progress = ?, updated_at = ? WHERE id = ?`,
      [totalIncome, new Date().toISOString(), goalId]
    );
  } catch (error) {
    logError('Failed to recalculate goal progress:', { error });
  }
}


/**
 * Get all goals for a specific wallet
 * @param walletId Wallet ID
 * @returns Array of goals linked to wallet
 */
export function getGoalsByWallet(walletId: number): Goal[] {
  try {
    const db = getDb();
    const result = db.execute(
      `SELECT * FROM goals WHERE linked_wallet_id = ? ORDER BY target_date ASC`,
      [walletId]
    );
    return (result.rows?._array ?? []).map(mapGoalRow);
  } catch (error) {
    logError('Failed to fetch goals by wallet:', { error });
    return [];
  }
}

/**
 * Get goals approaching deadline (within 30 days)
 * @returns Array of upcoming goals
 */
export function getUpcomingGoals(): GoalWithMetrics[] {
  try {
    const goals = getGoals();
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return goals
      .filter((goal: Goal) => {
        const targetDate = new Date(goal.targetDate);
        return targetDate >= today && targetDate <= thirtyDaysLater;
      })
      .map((goal: Goal) => calculateGoalMetrics(goal))
      .sort((a: GoalWithMetrics, b: GoalWithMetrics) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  } catch (error) {
    logError('Failed to fetch upcoming goals:', { error });
    return [];
  }
}

/**
 * Get goals that are at risk (not on track)
 * @returns Array of at-risk goals
 */
export function getAtRiskGoals(): GoalWithMetrics[] {
  try {
    const goals = getGoals();
    const today = new Date();

    return goals
      .filter((goal: Goal) => {
        const targetDate = new Date(goal.targetDate);
        return targetDate > today; // Only active goals
      })
      .map((goal: Goal) => calculateGoalMetrics(goal))
      .filter((g: GoalWithMetrics) => !g.onTrack)
      .sort((a: GoalWithMetrics, b: GoalWithMetrics) => b.daysRemaining - a.daysRemaining);
  } catch (error) {
    logError('Failed to fetch at-risk goals:', { error });
    return [];
  }
}
