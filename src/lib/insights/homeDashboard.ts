import { getGoals, calculateGoalMetrics } from '@/lib/db/goals';
import { getActiveBudgets, calculateBudgetMetrics } from '@/lib/db/budgets';
import { exec } from '@/lib/db';
import {
  getIncomeExpenseForPeriod,
  getTransactionsForPeriod,
  getWalletsOrderedByRecentActivity,
} from '@/lib/db/transactions';
import { GoalWithMetrics, BudgetWithMetrics } from '@/types/goal';
import { Transaction } from '@/types/transaction';

export type HomeDashboardPeriod = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'custom';
export type HomeDashboardChartRange = '7d' | '3m' | '6m';

export interface HomeDashboardSnapshot {
  activeBudgets: BudgetWithMetrics[];
  chartData: Array<{ date: string; expense: number; income: number }>;
  expenses: number;
  goals: GoalWithMetrics[];
  income: number;
  recentOrder: number[] | null;
  upcomingTransactions: Transaction[];
}

interface GetHomeDashboardSnapshotInput {
  chartRange: HomeDashboardChartRange;
  customEndDate?: Date | null;
  customStartDate?: Date | null;
  selectedPeriod: HomeDashboardPeriod;
  walletExchangeRate: Record<number, number>;
}

function buildChartData(
  chartRange: HomeDashboardChartRange,
  transactions: Transaction[],
  walletExchangeRate: Record<number, number>
): Array<{ date: string; expense: number; income: number }> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const sumIncome = (items: Transaction[]) =>
    items
      .filter((transaction) => transaction.type === 'income' && transaction.category !== 'Transfer')
      .reduce(
        (sum, transaction) => sum + transaction.amount * (walletExchangeRate[transaction.wallet_id] ?? 1.0),
        0
      );

  const sumExpense = (items: Transaction[]) =>
    items
      .filter((transaction) => transaction.type === 'expense' && transaction.category !== 'Transfer')
      .reduce(
        (sum, transaction) =>
          sum + Math.abs(transaction.amount * (walletExchangeRate[transaction.wallet_id] ?? 1.0)),
        0
      );

  if (chartRange === '7d') {
    return Array.from({ length: 7 }, (_, index) => {
      const dayOffset = 6 - index;
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - dayOffset);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const dayTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= dayStart && transactionDate < dayEnd;
      });

      return {
        date: dayStart.toISOString(),
        expense: sumExpense(dayTransactions),
        income: sumIncome(dayTransactions),
      };
    });
  }

  const months = chartRange === '3m' ? 3 : 6;
  const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from({ length: months }, (_, index) => {
    const monthOffset = months - 1 - index;
    const monthStart = new Date(
      firstOfCurrentMonth.getFullYear(),
      firstOfCurrentMonth.getMonth() - monthOffset,
      1
    );
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    const monthTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= monthStart && transactionDate < monthEnd;
    });

    return {
      date: monthStart.toISOString(),
      expense: sumExpense(monthTransactions),
      income: sumIncome(monthTransactions),
    };
  });
}

function resolvePeriodWindow(
  selectedPeriod: HomeDashboardPeriod,
  chartRange: HomeDashboardChartRange,
  customStartDate?: Date | null,
  customEndDate?: Date | null
): {
  fetchEndDate: Date;
  fetchStartDate: Date;
  periodEndDate: Date;
  periodStartDate: Date;
} {
  const now = new Date();

  let chartStartDate: Date;
  switch (chartRange) {
    case '7d':
      chartStartDate = new Date(now);
      chartStartDate.setDate(now.getDate() - 7);
      break;
    case '3m':
      chartStartDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case '6m':
      chartStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
  }

  let periodStartDate: Date;
  let periodEndDate = now;

  switch (selectedPeriod) {
    case 'all':
      periodStartDate = new Date(0);
      break;
    case 'today':
      periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      periodStartDate = new Date(now);
      periodStartDate.setDate(now.getDate() - dayOfWeek);
      periodStartDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'lastMonth': {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodStartDate = lastMonthDate;
      periodEndDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'custom':
      if (customStartDate && customEndDate) {
        periodStartDate = customStartDate;
        periodEndDate = customEndDate;
      } else {
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      break;
  }

  const fetchStartDate = selectedPeriod === 'all'
    ? new Date(0)
    : new Date(Math.min(chartStartDate.getTime(), periodStartDate.getTime()));
  fetchStartDate.setHours(0, 0, 0, 0);

  const fetchEndDate = new Date(Math.max(periodEndDate.getTime(), now.getTime()));
  fetchEndDate.setHours(23, 59, 59, 999);

  periodStartDate.setHours(0, 0, 0, 0);
  periodEndDate.setHours(23, 59, 59, 999);

  return {
    fetchEndDate,
    fetchStartDate,
    periodEndDate,
    periodStartDate,
  };
}

async function getUpcomingRecurringTransactions(limit = 3): Promise<Transaction[]> {
  const transactions = await exec<Transaction>(
    `SELECT t.*
     FROM transactions t
     WHERE t.is_recurring = 1
     ORDER BY ABS(t.amount) DESC
     LIMIT ?`,
    [limit]
  );

  return transactions || [];
}

export async function getHomeDashboardSnapshot(
  input: GetHomeDashboardSnapshotInput
): Promise<HomeDashboardSnapshot> {
  const window = resolvePeriodWindow(
    input.selectedPeriod,
    input.chartRange,
    input.customStartDate,
    input.customEndDate
  );

  const [recentOrder, transactions, periodTotals, budgets, goals, upcomingTransactions] = await Promise.all([
    getWalletsOrderedByRecentActivity().catch(() => null),
    getTransactionsForPeriod(window.fetchStartDate, window.fetchEndDate),
    getIncomeExpenseForPeriod(window.periodStartDate, window.periodEndDate),
    getActiveBudgets().then((items) => items.map(calculateBudgetMetrics)),
    getGoals().then((items) => items.map(calculateGoalMetrics)),
    getUpcomingRecurringTransactions(),
  ]);

  return {
    activeBudgets: budgets,
    chartData: buildChartData(input.chartRange, transactions, input.walletExchangeRate),
    expenses: periodTotals.expense,
    goals,
    income: periodTotals.income,
    recentOrder,
    upcomingTransactions,
  };
}
