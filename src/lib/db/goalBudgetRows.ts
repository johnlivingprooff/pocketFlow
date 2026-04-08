import type { Budget, Goal } from '@/types/goal';
import { parseJsonNumberArray } from './idLists';

export type GoalRow = {
  createdAt: string;
  currentProgress: number;
  id: number;
  linkedWalletIds: string | null;
  name: string;
  notes: string | null;
  startDate: string;
  targetAmount: number;
  targetDate: string;
  updatedAt: string;
};

export type BudgetRow = {
  categoryIds: string | null;
  createdAt: string;
  currentSpending: number;
  endDate: string;
  id: number;
  isRecurring: number;
  limitAmount: number;
  linkedWalletIds: string | null;
  name: string;
  notes: string | null;
  periodType: string;
  recurrenceEndDate: string | null;
  recurrenceParentId: number | null;
  startDate: string;
  subcategoryIds: string | null;
  updatedAt: string;
};

export const GOAL_SELECT_FIELDS = `id,
  name,
  target_amount as targetAmount,
  current_progress as currentProgress,
  start_date as startDate,
  target_date as targetDate,
  notes,
  linked_wallet_ids as linkedWalletIds,
  created_at as createdAt,
  updated_at as updatedAt`;

export const BUDGET_SELECT_FIELDS = `id,
  name,
  category_ids as categoryIds,
  subcategory_ids as subcategoryIds,
  limit_amount as limitAmount,
  current_spending as currentSpending,
  period_type as periodType,
  start_date as startDate,
  end_date as endDate,
  notes,
  linked_wallet_ids as linkedWalletIds,
  is_recurring as isRecurring,
  recurrence_end_date as recurrenceEndDate,
  recurrence_parent_id as recurrenceParentId,
  created_at as createdAt,
  updated_at as updatedAt`;

export function resolveGoalWalletIds(row: Pick<GoalRow, 'linkedWalletIds'>): number[] {
  return parseJsonNumberArray(row.linkedWalletIds);
}

export function resolveBudgetCategoryIds(row: Pick<BudgetRow, 'categoryIds'>): number[] {
  return parseJsonNumberArray(row.categoryIds);
}

export function resolveBudgetSubcategoryIds(row: Pick<BudgetRow, 'subcategoryIds'>): number[] {
  return parseJsonNumberArray(row.subcategoryIds);
}

export function resolveBudgetWalletIds(row: Pick<BudgetRow, 'linkedWalletIds'>): number[] {
  return parseJsonNumberArray(row.linkedWalletIds);
}

export function mapGoalRow(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    currentProgress: row.currentProgress,
    startDate: row.startDate,
    targetDate: row.targetDate,
    notes: row.notes ?? undefined,
    linkedWalletIds: resolveGoalWalletIds(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapBudgetRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    name: row.name,
    categoryIds: resolveBudgetCategoryIds(row),
    subcategoryIds: resolveBudgetSubcategoryIds(row),
    limitAmount: row.limitAmount,
    currentSpending: row.currentSpending,
    periodType: row.periodType as Budget['periodType'],
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes ?? undefined,
    linkedWalletIds: resolveBudgetWalletIds(row),
    isRecurring: Boolean(row.isRecurring),
    recurrenceEndDate: row.recurrenceEndDate ?? undefined,
    recurrenceParentId: row.recurrenceParentId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
