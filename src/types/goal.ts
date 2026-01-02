/**
 * Financial Goals and Budgets Type Definitions
 */

/**
 * Goal: Independent income-based savings target
 * User accumulates income toward a target amount by a deadline
 */
export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  currentProgress: number;
  targetDate: string; // ISO 8601
  notes?: string;
  linkedWalletIds: number[]; // Support multiple wallets or "all"
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}

/**
 * Goal with calculated metrics for display
 */
export interface GoalWithMetrics extends Goal {
  progressPercentage: number; // 0-100
  daysRemaining: number;
  monthlyRequired: number;
  onTrack: boolean;
}

/**
 * Budget: Spending limit for categories within a period
 */
export interface Budget {
  id?: number;
  name: string;
  categoryIds: number[]; // Support multiple categories
  subcategoryIds?: number[]; // Support multiple subcategories
  limitAmount: number;
  currentSpending: number;
  periodType: 'weekly' | 'monthly' | 'custom';
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  notes?: string;
  linkedWalletIds: number[]; // Support multiple wallets or "all"
  isRecurring: boolean;
  recurrenceEndDate?: string | null;
  recurrenceParentId?: number | null;
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}

/**
 * Budget with calculated metrics for display
 */
export interface BudgetWithMetrics extends Budget {
  remainingBalance: number;
  percentageUsed: number;
  isOverBudget: boolean;
  daysRemaining: number;
  averageDailySpend: number;
}

/**
 * Request payload for creating/updating a goal
 */
export interface GoalInput {
  name: string;
  targetAmount: number;
  targetDate: string;
  notes?: string;
  linkedWalletIds: number[]; // Support multiple wallets
}

/**
 * Request payload for creating/updating a budget
 */
export interface BudgetInput {
  name: string;
  categoryIds: number[]; // Support multiple categories
  subcategoryIds?: number[]; // Support multiple subcategories
  limitAmount: number;
  periodType: 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  notes?: string;
  linkedWalletIds: number[]; // Support multiple wallets
  isRecurring?: boolean;
  recurrenceEndDate?: string | null;
  recurrenceParentId?: number | null;
}
