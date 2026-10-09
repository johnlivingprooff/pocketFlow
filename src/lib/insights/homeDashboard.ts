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

  if (chartRange === '7d') {
    // Single pass: previously 7 full scans × (filter + reduce) with a
    // `new Date()` per transaction per bucket (7×R parses). Now parse once
    // and compare against precomputed day boundaries. Identical buckets.
    const buckets: Array<{ date: string; expense: number; income: number }> = [];
    const dayStarts: number[] = [];
    const dayEnds: number[] = [];
    for (let index = 0; index < 7; index++) {
      const dayOffset = 6 - index;
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - dayOffset);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      dayStarts.push(dayStart.getTime());
      dayEnds.push(dayEnd.getTime());
      buckets.push({ date: dayStart.toISOString(), expense: 0, income: 0 });
    }
    for (const transaction of transactions) {
      if (transaction.category === 'Transfer') continue;
      if (transaction.type !== 'income' && transaction.type !== 'expense') continue;
      const ts = new Date(transaction.date).getTime();
      if (!Number.isFinite(ts)) continue;
      for (let i = 0; i < 7; i++) {
        if (ts >= dayStarts[i] && ts < dayEnds[i]) {
          const rate = walletExchangeRate[transaction.wallet_id] ?? 1.0;
          if (transaction.type === 'income') buckets[i].income += transaction.amount * rate;
          else buckets[i].expense += Math.abs(transaction.amount * rate);
          break;
        }
      }
    }
    return buckets;
  }

  const months = chartRange === '3m' ? 3 : 6;
  const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Single pass over transactions (was months × full scans with new Date per
  // transaction per bucket). Precompute month start timestamps once.
  const monthStarts: number[] = [];
  const buckets: Array<{ date: string; expense: number; income: number }> = [];
  for (let index = 0; index < months; index++) {
    const monthOffset = months - 1 - index;
    const monthStart = new Date(
      firstOfCurrentMonth.getFullYear(),
      firstOfCurrentMonth.getMonth() - monthOffset,
      1
    );
    monthStarts.push(monthStart.getTime());
    buckets.push({ date: monthStart.toISOString(), expense: 0, income: 0 });
  }
  const firstMonth = monthStarts[0];
  const firstMonthDate = new Date(firstMonth);
  const firstMonthIndex = firstMonthDate.getFullYear() * 12 + firstMonthDate.getMonth();
  for (const transaction of transactions) {
    if (transaction.category === 'Transfer') continue;
    const d = new Date(transaction.date);
    const ts = d.getTime();
    if (!Number.isFinite(ts) || ts < firstMonth) continue;
    // Month index from calendar arithmetic (matches original monthStart/monthEnd compare)
    const monthDiff = d.getFullYear() * 12 + d.getMonth() - firstMonthIndex;
    if (monthDiff < 0 || monthDiff >= months) continue;
    const rate = walletExchangeRate[transaction.wallet_id] ?? 1.0;
    if (transaction.type === 'income') {
      buckets[monthDiff].income += transaction.amount * rate;
    } else if (transaction.type === 'expense') {
      buckets[monthDiff].expense += Math.abs(transaction.amount * rate);
    }
  }
  return buckets;
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
