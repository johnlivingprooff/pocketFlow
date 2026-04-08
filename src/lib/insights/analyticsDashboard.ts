import { exec } from '@/lib/db';
import { getBudgetsForPeriod } from '@/lib/db/budgets';
import { getCategories } from '@/lib/db/categories';
import { getGoalsForPeriod } from '@/lib/db/goals';
import {
  getCategorySpendingForPeriod,
  getDailySpendingForMonth,
  getMonthProgress,
  getMonthlyComparison,
  getSevenDaySpendingTrend,
  getSpendingStreak,
  incomeVsExpenseAnalysis,
  weekOverWeekComparison,
} from '@/lib/db/transactions';
import { calculateFinancialHealthScore, FinancialHealthScore } from '@/lib/insights/analyticsInsights';
import { Budget, Goal } from '@/types/goal';

export type AnalyticsTimePeriod = '7days' | '30days' | '3months' | '6months' | 'all';
export type AnalyticsMetricsPeriod = Exclude<AnalyticsTimePeriod, 'all'>;

const PERIOD_DAYS_MAP: Record<AnalyticsTimePeriod, number> = {
  '7days': 7,
  '30days': 30,
  '3months': 90,
  '6months': 180,
  all: 3650,
};

type CategoryBreakdown = {
  category: string;
  total: number;
};

type SummaryRow = {
  total?: number;
};

type LargestPurchaseRow = {
  amount?: number;
};

export interface AnalyticsDashboardSnapshot {
  analyticsPeriod: AnalyticsMetricsPeriod;
  breakdown: CategoryBreakdown[];
  budgets: Budget[];
  categoryColorMap: Record<string, string>;
  dailySpending: Awaited<ReturnType<typeof getDailySpendingForMonth>>;
  financialHealth: FinancialHealthScore;
  goals: Goal[];
  incomeExpense: Awaited<ReturnType<typeof incomeVsExpenseAnalysis>>;
  incomeForPeriod: number;
  largestPurchaseForPeriod: number;
  monthProgress: Awaited<ReturnType<typeof getMonthProgress>>;
  monthlyComparison: Awaited<ReturnType<typeof getMonthlyComparison>>;
  sevenDayTrend: Awaited<ReturnType<typeof getSevenDaySpendingTrend>>;
  spendingForPeriod: number;
}

export function resolveAnalyticsMetricsPeriod(period: AnalyticsTimePeriod): AnalyticsMetricsPeriod {
  return period === 'all' ? '30days' : period;
}

async function getSelectedPeriodMetrics(
  analyticsPeriod: AnalyticsMetricsPeriod
): Promise<{
  incomeForPeriod: number;
  largestPurchaseForPeriod: number;
  spendingForPeriod: number;
}> {
  const now = new Date();
  const metricStartDate = new Date(now);
  metricStartDate.setDate(now.getDate() - PERIOD_DAYS_MAP[analyticsPeriod]);

  const metricStart = metricStartDate.toISOString();
  const metricEnd = now.toISOString();

  const [incomeResult, expenseResult, largestResult] = await Promise.all([
    exec<SummaryRow>(
      `SELECT COALESCE(SUM(t.amount * COALESCE(w.exchange_rate, 1.0)),0) as total
       FROM transactions t
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'income' AND t.date BETWEEN ? AND ? AND (t.category IS NULL OR t.category <> 'Transfer');`,
      [metricStart, metricEnd]
    ),
    exec<SummaryRow>(
      `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total
       FROM transactions t
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'expense' AND t.date BETWEEN ? AND ? AND (t.category IS NULL OR t.category <> 'Transfer');`,
      [metricStart, metricEnd]
    ),
    exec<LargestPurchaseRow>(
      `SELECT ABS(t.amount * COALESCE(w.exchange_rate, 1.0)) as amount
       FROM transactions t
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.date BETWEEN ? AND ? AND t.type = 'expense' AND (t.category IS NULL OR t.category <> 'Transfer')
       ORDER BY ABS(t.amount * COALESCE(w.exchange_rate, 1.0)) DESC
       LIMIT 1;`,
      [metricStart, metricEnd]
    ),
  ]);

  return {
    incomeForPeriod: incomeResult[0]?.total ?? 0,
    largestPurchaseForPeriod: largestResult[0]?.amount ?? 0,
    spendingForPeriod: expenseResult[0]?.total ?? 0,
  };
}

async function getCategoryColorMap(): Promise<Record<string, string>> {
  const categories = await getCategories();
  const categoryColorMap: Record<string, string> = {};

  for (const category of categories) {
    if (category.name && category.color) {
      categoryColorMap[category.name] = category.color;
    }
  }

  return categoryColorMap;
}

export async function getAnalyticsDashboardSnapshot(
  period: AnalyticsTimePeriod
): Promise<AnalyticsDashboardSnapshot> {
  const analyticsPeriod = resolveAnalyticsMetricsPeriod(period);
  const selectedDays = PERIOD_DAYS_MAP[period];

  const [
    breakdown,
    selectedPeriodMetrics,
    weekComparison,
    incomeExpense,
    spendingStreak,
    monthProgress,
    sevenDayTrend,
    dailySpending,
    monthlyComparison,
    categoryColorMap,
    budgets,
    goals,
  ] = await Promise.all([
    getCategorySpendingForPeriod(analyticsPeriod),
    getSelectedPeriodMetrics(analyticsPeriod),
    weekOverWeekComparison(),
    incomeVsExpenseAnalysis('current'),
    getSpendingStreak(),
    getMonthProgress(),
    getSevenDaySpendingTrend(),
    getDailySpendingForMonth(),
    getMonthlyComparison(analyticsPeriod),
    getCategoryColorMap(),
    getBudgetsForPeriod(selectedDays).catch((error) => {
      console.error('Failed to load budgets:', error);
      return [];
    }),
    getGoalsForPeriod(selectedDays).catch((error) => {
      console.error('Failed to load goals:', error);
      return [];
    }),
  ]);

  return {
    analyticsPeriod,
    breakdown,
    budgets,
    categoryColorMap,
    dailySpending,
    financialHealth: calculateFinancialHealthScore({
      dailySpending,
      incomeExpense,
      spendingStreak,
      weekComparison,
    }),
    goals,
    incomeExpense,
    incomeForPeriod: selectedPeriodMetrics.incomeForPeriod,
    largestPurchaseForPeriod: selectedPeriodMetrics.largestPurchaseForPeriod,
    monthProgress,
    monthlyComparison,
    sevenDayTrend,
    spendingForPeriod: selectedPeriodMetrics.spendingForPeriod,
  };
}
