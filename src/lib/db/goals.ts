/**
 * Goals Database Layer
 * Handles all CRUD operations and progress tracking for financial goals
 */

import { Goal, GoalWithMetrics, GoalInput } from '@/types/goal';
import { execRun, exec } from '.';
import { enqueueWrite } from './writeQueue';

/**
 * Create a new goal
 * @param goal Goal data to create
 * @returns Created goal with ID
 */
export async function createGoal(goal: GoalInput): Promise<Goal> {
  const now = new Date().toISOString();
  const createdGoal: Goal = {
    ...goal,
    currentProgress: 0,
    createdAt: now,
    updatedAt: now,
  };

  await enqueueWrite(async () => {
    await execRun(
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
  }, 'createGoal');

  return createdGoal;
}

/**
 * Get all goals for the current user
 * @returns Array of goals
 */
export async function getGoals(): Promise<Goal[]> {
  try {
    const goals = await exec<Goal>(
      `SELECT id, name, target_amount as targetAmount, current_progress as currentProgress,
              target_date as targetDate, notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM goals
       ORDER BY created_at DESC`
    );
    return goals;
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return [];
  }
}

/**
 * Get a specific goal by ID
 * @param id Goal ID
 * @returns Goal or null if not found
 */
export async function getGoalById(id: number): Promise<Goal | null> {
  try {
    const result = await exec<Goal>(
      `SELECT id, name, target_amount as targetAmount, current_progress as currentProgress,
              target_date as targetDate, notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM goals
       WHERE id = ?`,
      [id]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch goal:', error);
    return null;
  }
}

/**
 * Get goal with calculated metrics
 * @param id Goal ID
 * @returns Goal with metrics or null
 */
export async function getGoalWithMetrics(id: number): Promise<GoalWithMetrics | null> {
  const goal = await getGoalById(id);
  if (!goal) return null;

  return calculateGoalMetrics(goal);
}

/**
 * Update a goal
 * @param id Goal ID
 * @param updates Partial goal data to update
 */
export async function updateGoal(id: number, updates: Partial<GoalInput>): Promise<void> {
  const now = new Date().toISOString();

  // Build dynamic update query
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
    // If wallet changed, recalculate progress
    const goal = await getGoalById(id);
    if (goal && goal.linkedWalletId !== updates.linkedWalletId) {
      fields.push('current_progress = ?');
      values.push(0);
    }
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await enqueueWrite(async () => {
    await execRun(
      `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }, 'updateGoal');
}

/**
 * Delete a goal
 * @param id Goal ID
 */
export async function deleteGoal(id: number): Promise<void> {
  await enqueueWrite(async () => {
    await execRun('DELETE FROM goals WHERE id = ?', [id]);
  }, 'deleteGoal');
}

/**
 * Update goal progress based on wallet income
 * Call this after creating/updating/deleting transactions
 * @param goalId Goal ID
 */
export async function recalculateGoalProgress(goalId: number): Promise<void> {
  const goal = await getGoalById(goalId);
  if (!goal) return;

  try {
    // Sum all income transactions in the linked wallet
    const result = await exec<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE wallet_id = ? AND type = 'income' AND category != 'Transfer'`,
      [goal.linkedWalletId]
    );

    const totalIncome = result[0]?.total || 0;

    await enqueueWrite(async () => {
      await execRun(
        `UPDATE goals SET current_progress = ?, updated_at = ? WHERE id = ?`,
        [totalIncome, new Date().toISOString(), goalId]
      );
    }, 'recalculateGoalProgress');
  } catch (error) {
    console.error('Failed to recalculate goal progress:', error);
  }
}

/**
 * Get all goals for a specific wallet
 * @param walletId Wallet ID
 * @returns Array of goals linked to wallet
 */
export async function getGoalsByWallet(walletId: number): Promise<Goal[]> {
  try {
    const goals = await exec<Goal>(
      `SELECT id, name, target_amount as targetAmount, current_progress as currentProgress,
              target_date as targetDate, notes, linked_wallet_id as linkedWalletId,
              created_at as createdAt, updated_at as updatedAt
       FROM goals
       WHERE linked_wallet_id = ?
       ORDER BY target_date ASC`,
      [walletId]
    );
    return goals;
  } catch (error) {
    console.error('Failed to fetch goals by wallet:', error);
    return [];
  }
}

/**
 * Calculate display metrics for a goal
 * @param goal Goal object
 * @returns Goal with calculated metrics
 */
export function calculateGoalMetrics(goal: Goal): GoalWithMetrics {
  const targetDate = new Date(goal.targetDate);
  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercentage = Math.min(100, (goal.currentProgress / goal.targetAmount) * 100);

  // Calculate monthly required to stay on track
  const monthsRemaining = Math.max(1, daysRemaining / 30);
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentProgress);
  const monthlyRequired = remainingAmount / monthsRemaining;

  // Determine if on track (user is meeting monthly requirements)
  const onTrack = daysRemaining > 0 && remainingAmount <= monthlyRequired * monthsRemaining;

  return {
    ...goal,
    progressPercentage,
    daysRemaining: Math.max(0, daysRemaining),
    monthlyRequired,
    onTrack,
  };
}

/**
 * Get goals approaching deadline (within 30 days)
 * @returns Array of upcoming goals
 */
export async function getUpcomingGoals(): Promise<GoalWithMetrics[]> {
  try {
    const goals = await getGoals();
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return goals
      .filter((goal) => {
        const targetDate = new Date(goal.targetDate);
        return targetDate >= today && targetDate <= thirtyDaysLater;
      })
      .map(calculateGoalMetrics)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  } catch (error) {
    console.error('Failed to fetch upcoming goals:', error);
    return [];
  }
}

/**
 * Get goals that are at risk (not on track)
 * @returns Array of at-risk goals
 */
export async function getAtRiskGoals(): Promise<GoalWithMetrics[]> {
  try {
    const goals = await getGoals();
    const today = new Date();

    return goals
      .filter((goal) => {
        const targetDate = new Date(goal.targetDate);
        return targetDate > today; // Only active goals
      })
      .map(calculateGoalMetrics)
      .filter((g) => !g.onTrack)
      .sort((a, b) => b.daysRemaining - a.daysRemaining);
  } catch (error) {
    console.error('Failed to fetch at-risk goals:', error);
    return [];
  }
}
