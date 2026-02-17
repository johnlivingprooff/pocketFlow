import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity, useColorScheme, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import {
  weekOverWeekComparison,
  incomeVsExpenseAnalysis,
  getSpendingStreak,
  getMonthProgress,
  getSevenDaySpendingTrend,
  getDailySpendingForMonth,
  getMonthlyComparison,
  getCategorySpendingForPeriod,
  getTransactionsByCategory
} from '../../src/lib/db/transactions';
import { exec } from '../../src/lib/db/index';
import { getCategories } from '../../src/lib/db/categories';
import { getBudgetsForPeriod } from '../../src/lib/db/budgets';
import { getGoalsForPeriod } from '../../src/lib/db/goals';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { formatShortDate } from '../../src/utils/date';
import { Link } from 'expo-router';
import { invalidateTransactionCaches, invalidateWalletCaches } from '../../src/lib/cache/queryCache';
import SevenDayTrendChart from '../../src/components/charts/SevenDayTrendChart';
import CandlestickChart from '../../src/components/charts/CandlestickChart';
import HorizontalBarChart from '../../src/components/charts/HorizontalBarChart';
import AnimatedProgressBar from '../../src/components/charts/AnimatedProgressBar';
import TimePeriodSelector, { TimePeriod } from '../../src/components/TimePeriodSelector';
import CategoryDrillDown from '../../src/components/CategoryDrillDown';
import HelpIcon from '../../src/components/HelpIcon';
import FinancialHealthRing from '../../src/components/FinancialHealthRing';
import { BudgetCard } from '../../src/components/BudgetCard';
import { GoalCard } from '../../src/components/GoalCard';
import {
  calculateFinancialHealthScore,
  FinancialHealthScore
} from '../../src/lib/insights/analyticsInsights';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';

// Helper function to format large numbers with abbreviations and comma separators
function abbreviateNumber(num: number): string {
  if (num < 999) return Math.round(num).toLocaleString('en-US');
  if (num < 1_000_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
}

type MetricsPeriod = '7days' | '30days' | '3months' | '6months';

const PERIOD_DAYS_MAP: Record<TimePeriod, number> = {
  '7days': 7,
  '30days': 30,
  '3months': 90,
  '6months': 180,
  'all': 3650,
};

export default function AnalyticsPage() {
  const { themeMode, defaultCurrency, userInfo } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [categories, setCategories] = useState<Array<{ category: string; total: number }>>([]);

  const [incomeByPeriod, setIncomeByPeriod] = useState<Record<MetricsPeriod, number>>({
    '7days': 0,
    '30days': 0,
    '3months': 0,
    '6months': 0
  });
  const [spendingRateByPeriod, setSpendingRateByPeriod] = useState<Record<MetricsPeriod, number>>({
    '7days': 0,
    '30days': 0,
    '3months': 0,
    '6months': 0
  });
  const [largestPurchaseByPeriod, setLargestPurchaseByPeriod] = useState<Record<MetricsPeriod, number>>({
    '7days': 0,
    '30days': 0,
    '3months': 0,
    '6months': 0
  });

  // Phase 1: Enhanced Analytics State
  const [incomeExpense, setIncomeExpense] = useState<{ income: number; expense: number; netSavings: number; savingsRate: number } | null>(null);
  const [monthProgress, setMonthProgress] = useState<{ currentDay: number; daysInMonth: number; progressPercentage: number; daysRemaining: number } | null>(null);

  // Phase 2: Chart Data State
  const [sevenDayTrend, setSevenDayTrend] = useState<Array<{ date: string; amount: number }>>([]);
  const [dailySpending, setDailySpending] = useState<Array<{ day: number; amount: number }>>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any>(null);
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({});

  // Phase 3: Insights & Financial Health State
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthScore | null>(null);

  // Phase 3.5: Budgets & Goals State
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | 'all'>('all');
  const [selectedGoalId, setSelectedGoalId] = useState<number | 'all'>('all');

  // Phase 4: Interactivity & Customization State
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30days');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Array<{ id: number; amount: number; date: string; notes?: string }>>([]);
  const [showCategoryDrillDown, setShowCategoryDrillDown] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { alertConfig, showSuccessAlert, dismissAlert } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadRequestIdRef = useRef(0);

  const loadData = useCallback(async (period: TimePeriod = '30days') => {
    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);

    try {
      if (Platform.OS === 'web') {
        return;
      }

      const now = new Date();
      const analyticsPeriod: MetricsPeriod = period === 'all' ? '30days' : period;
      const selectedDays = PERIOD_DAYS_MAP[period];
      const activeIncomeExpensePeriod: 'current' | 'last' = 'current';

      const metricStartDate = new Date(now);
      metricStartDate.setDate(now.getDate() - PERIOD_DAYS_MAP[analyticsPeriod]);
      const metricStart = metricStartDate.toISOString();
      const metricEnd = now.toISOString();

      const selectedPeriodMetricsPromise = Promise.all([
        exec<{ total: number }>(
          `SELECT COALESCE(SUM(t.amount * COALESCE(w.exchange_rate, 1.0)),0) as total
           FROM transactions t
           LEFT JOIN wallets w ON t.wallet_id = w.id
           WHERE t.type = 'income' AND t.date BETWEEN ? AND ? AND (t.category IS NULL OR t.category <> 'Transfer');`,
          [metricStart, metricEnd]
        ),
        exec<{ total: number }>(
          `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total
           FROM transactions t
           LEFT JOIN wallets w ON t.wallet_id = w.id
           WHERE t.type = 'expense' AND t.date BETWEEN ? AND ? AND (t.category IS NULL OR t.category <> 'Transfer');`,
          [metricStart, metricEnd]
        ),
        exec<{ amount: number }>(
          `SELECT ABS(t.amount * COALESCE(w.exchange_rate, 1.0)) as amount
           FROM transactions t
           LEFT JOIN wallets w ON t.wallet_id = w.id
           WHERE t.date BETWEEN ? AND ? AND t.type = 'expense' AND (t.category IS NULL OR t.category <> 'Transfer')
           ORDER BY ABS(t.amount * COALESCE(w.exchange_rate, 1.0)) DESC
           LIMIT 1;`,
          [metricStart, metricEnd]
        ),
      ]);

      const budgetsPromise = getBudgetsForPeriod(selectedDays).catch((error) => {
        console.error('Failed to load budgets:', error);
        return [];
      });
      const goalsPromise = getGoalsForPeriod(selectedDays).catch((error) => {
        console.error('Failed to load goals:', error);
        return [];
      });

      const [
        breakdown,
        [incomeResult, expenseResult, largestResult],
        weekComp,
        incExpAnalysis,
        streak,
        progress,
        sevenDay,
        daily,
        comparison,
        allCategories,
        periodBudgets,
        periodGoals,
      ] = await Promise.all([
        getCategorySpendingForPeriod(analyticsPeriod),
        selectedPeriodMetricsPromise,
        weekOverWeekComparison(),
        incomeVsExpenseAnalysis(activeIncomeExpensePeriod),
        getSpendingStreak(),
        getMonthProgress(),
        getSevenDaySpendingTrend(),
        getDailySpendingForMonth(),
        getMonthlyComparison(analyticsPeriod),
        getCategories(),
        budgetsPromise,
        goalsPromise,
      ]);

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const incomeForPeriod = incomeResult[0]?.total ?? 0;
      const spendingForPeriod = expenseResult[0]?.total ?? 0;
      const largestPurchaseForPeriod = largestResult[0]?.amount ?? 0;

      const colorMap: Record<string, string> = {};
      allCategories.forEach((cat) => {
        if (cat.name && cat.color) {
          colorMap[cat.name] = cat.color;
        }
      });

      const healthScore = calculateFinancialHealthScore({
        incomeExpense: incExpAnalysis,
        spendingStreak: streak,
        weekComparison: weekComp,
        dailySpending: daily,
      });

      setCategories(breakdown);
      setIncomeByPeriod((prev) => ({ ...prev, [analyticsPeriod]: incomeForPeriod }));
      setSpendingRateByPeriod((prev) => ({ ...prev, [analyticsPeriod]: spendingForPeriod }));
      setLargestPurchaseByPeriod((prev) => ({ ...prev, [analyticsPeriod]: largestPurchaseForPeriod }));

      setIncomeExpense(incExpAnalysis);
      setMonthProgress(progress);

      setSevenDayTrend(sevenDay);
      setDailySpending(daily);
      setMonthlyComparison(comparison);
      setCategoryColorMap(colorMap);
      setFinancialHealth(healthScore);

      setBudgets(periodBudgets);
      setGoals(periodGoals);
    } catch (error) {
      if (requestId === loadRequestIdRef.current) {
        console.error('Failed to load analytics data:', error);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear all caches to force fresh analytics data
      invalidateTransactionCaches();
      invalidateWalletCaches();
      await loadData(selectedPeriod);
      console.log('Analytics refreshed - all caches cleared');
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      void loadData(selectedPeriod);
    }, [loadData, selectedPeriod])
  );

  // Phase 4: Handle period change
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
    setShowAllCategories(false);
  }, []);

  // Phase 4: Handle category drill-down
  const handleCategoryClick = useCallback(async (category: string) => {
    if (Platform.OS !== 'web') {
      setSelectedCategory(category);
      const drilldownPeriod: MetricsPeriod = selectedPeriod === 'all' ? '30days' : selectedPeriod;
      const transactions = await getTransactionsByCategory(category, drilldownPeriod);
      // Map null notes to undefined to match the component's type
      setCategoryTransactions(transactions.map(t => ({ ...t, notes: t.notes ?? undefined })));
      setShowCategoryDrillDown(true);
    }
  }, [selectedPeriod]);

  // Calculate pie chart segments
  const total = categories.reduce((sum, cat) => sum + cat.total, 0);
  const chartData = categories.map(cat => ({
    ...cat,
    percentage: total > 0 ? (cat.total / total) * 100 : 0
  }));

  const selectedMetricsPeriod: MetricsPeriod = selectedPeriod === 'all' ? '30days' : selectedPeriod;
  const incomeCardLabel = selectedMetricsPeriod === '7days'
    ? 'Income (Week)'
    : selectedMetricsPeriod === '30days'
      ? 'Income (Month)'
      : selectedMetricsPeriod === '3months'
        ? 'Income (3M)'
        : 'Income (6M)';
  const spendingCardLabel = selectedMetricsPeriod === '7days'
    ? 'Spending (Week)'
    : selectedMetricsPeriod === '30days'
      ? 'Spending (Month)'
      : selectedMetricsPeriod === '3months'
        ? 'Spending (3M)'
        : 'Spending (6M)';

  // Use actual category colors, fallback to theme colors
  const fallbackColors = ['#C1A12F', '#84670B', '#B3B09E', '#6B6658', '#332D23', '#8B7355', '#A67C52', '#D4AF37'];

  // Skeleton Components for Granular Loading
  const KPISkeleton = () => (
    <View style={{ marginBottom: 24 }}>
      <View style={{ height: 18, width: 100, backgroundColor: t.card, borderRadius: 4, marginBottom: 12, opacity: 0.5 }} />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1, height: 100, backgroundColor: t.card, borderRadius: 14, opacity: 0.5 }} />
        <View style={{ flex: 1, height: 100, backgroundColor: t.card, borderRadius: 14, opacity: 0.5 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, height: 100, backgroundColor: t.card, borderRadius: 14, opacity: 0.5 }} />
        <View style={{ flex: 1, height: 100, backgroundColor: t.card, borderRadius: 14, opacity: 0.5 }} />
      </View>
    </View>
  );

  const ChartSkeleton = ({ height = 220, titleWidth = 150 }) => (
    <View style={{ marginBottom: 24 }}>
      <View style={{ height: 18, width: titleWidth, backgroundColor: t.card, borderRadius: 4, marginBottom: 12, opacity: 0.5 }} />
      <View style={{ height: height, backgroundColor: t.card, borderRadius: 14, opacity: 0.5 }} />
    </View>
  );

  const MonthProgressSkeleton = () => (
    <View style={{ marginBottom: 24 }}>
      <View style={{ height: 18, width: 180, backgroundColor: t.card, borderRadius: 4, marginBottom: 12, opacity: 0.5 }} />
      <View style={{ height: 60, backgroundColor: t.card, borderRadius: 12, marginBottom: 12, opacity: 0.5 }} />
    </View>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.primary} colors={[t.primary]} />}
      >
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 }}>
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Analytics</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Your financial snapshot</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Link href="/profile" asChild>
              <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', ...shadows.sm }}>
                {userInfo?.profileImage ? (
                  <Image source={{ uri: userInfo.profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                    {(userInfo?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Time Period Selector */}
        <View style={{ marginBottom: 20 }}>
          <TimePeriodSelector
            selectedPeriod={selectedPeriod}
            onSelectPeriod={handlePeriodChange}
            textColor={t.textPrimary}
            backgroundColor={t.card}
            primaryColor={t.primary}
            borderColor={t.border}
          />
        </View>

        {/* SECTION 1: KEY PERFORMANCE INDICATORS (KPIs) */}
        {isLoading ? (
          <KPISkeleton />
        ) : (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Overview</Text>

            {/* Net Flow + Income */}
            {incomeExpense && (
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 14,
                  padding: 16,
                  ...shadows.sm
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>Net Flow</Text>
                    <HelpIcon
                      onPress={() => showSuccessAlert(
                        'Net Flow',
                        'Your net savings (income minus expenses). Positive values show you\'re saving money, while negative values indicate you\'re spending more than you earn.'
                      )}
                      color={t.textSecondary}
                    />
                  </View>
                  <Text style={{ color: incomeExpense.netSavings >= 0 ? t.success : t.danger, fontSize: 20, fontWeight: '800' }}>
                    {abbreviateNumber(incomeExpense.netSavings)}
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>
                    {incomeExpense.savingsRate.toFixed(1)}% savings rate
                  </Text>
                </View>

                <View style={{
                  flex: 1,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 14,
                  padding: 16,
                  ...shadows.sm
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>
                      {incomeCardLabel}
                    </Text>
                    <HelpIcon
                      onPress={() => showSuccessAlert(
                        'Income',
                        'Total income received during the selected period from all sources.'
                      )}
                      color={t.textSecondary}
                    />
                  </View>
                  <Text style={{ color: t.success, fontSize: 20, fontWeight: '800' }}>
                    {abbreviateNumber(incomeByPeriod[selectedMetricsPeriod] || 0)}
                  </Text>
                </View>
              </View>
            )}

            {/* Spending Rate + Largest Purchase */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{
                flex: 1,
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                padding: 16,
                ...shadows.sm
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>
                      {spendingCardLabel}
                  </Text>
                  <HelpIcon
                    onPress={() => showSuccessAlert(
                      'Spending Rate',
                      'Total expenses during the selected period.'
                    )}
                    color={t.textSecondary}
                  />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                  {abbreviateNumber(spendingRateByPeriod[selectedMetricsPeriod] || 0)}
                </Text>
              </View>

              <View style={{
                flex: 1,
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                padding: 16,
                ...shadows.sm
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>Largest Purchase</Text>
                  <HelpIcon
                    onPress={() => showSuccessAlert(
                      'Largest Purchase',
                      'The highest amount spent on a single transaction during the selected period.'
                    )}
                    color={t.textSecondary}
                  />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                  {abbreviateNumber(largestPurchaseByPeriod[selectedMetricsPeriod] || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* SECTION 1.5: FINANCIAL HEALTH (Repositioned) */}
        {!isLoading && financialHealth && (
          <View style={{ marginBottom: 24 }}>
            <FinancialHealthRing
              healthScore={financialHealth}
              textColor={t.textPrimary}
              backgroundColor={t.card}
              primaryColor={t.primary}
            />
          </View>
        )}

        {/* SECTION 2: MONTH PROGRESS */}
        {isLoading ? (
          <MonthProgressSkeleton />
        ) : (
          monthProgress && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Month Progress</Text>

              <View style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                padding: 16,
                ...shadows.sm
              }}>
                <AnimatedProgressBar
                  progress={monthProgress.progressPercentage}
                  label={`Day ${monthProgress.currentDay}/${monthProgress.daysInMonth}`}
                  value={`${monthProgress.progressPercentage.toFixed(0)}%`}
                  color={t.primary}
                  backgroundColor={t.background}
                  textColor={t.textPrimary}
                />
                <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 8 }}>
                  {monthProgress.daysRemaining} day{monthProgress.daysRemaining !== 1 ? 's' : ''} remaining
                </Text>
              </View>
            </View>
          )
        )}

        {/* SECTION 3: TRENDS (Forex-style Candlestick Chart) */}
        {isLoading ? (
          selectedMetricsPeriod !== '7days' && <ChartSkeleton height={250} titleWidth={160} />
        ) : (
          monthlyComparison && selectedMetricsPeriod !== '7days' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
                {selectedMetricsPeriod === '3months' ? '3-Month Trends' : selectedMetricsPeriod === '6months' ? '6-Month Trends' : 'Monthly Trends'}
              </Text>

              <View style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                padding: 16,
                ...shadows.sm
              }}>
                <CandlestickChart
                  data={
                    (() => {
                      const now = new Date();
                      return selectedMetricsPeriod === '3months' && monthlyComparison.threeMonths
                        ? monthlyComparison.threeMonths.map((monthData: any, index: number) => ({
                          label: new Date(now.getFullYear(), now.getMonth() - (2 - index), 1).toLocaleString('default', { month: 'short' }),
                          income: monthData.income,
                          expense: monthData.expense,
                          net: monthData.net
                        }))
                        : selectedMetricsPeriod === '6months' && monthlyComparison.sixMonths
                          ? monthlyComparison.sixMonths.map((monthData: any, index: number) => ({
                            label: new Date(now.getFullYear(), now.getMonth() - (5 - index), 1).toLocaleString('default', { month: 'short' }),
                            income: monthData.income,
                            expense: monthData.expense,
                            net: monthData.net
                          }))
                          : selectedMetricsPeriod === '30days' && monthlyComparison.thisMonth && monthlyComparison.lastMonth
                            ? [
                              {
                                label: 'Last Month',
                                income: monthlyComparison.lastMonth.income,
                                expense: monthlyComparison.lastMonth.expense,
                                net: monthlyComparison.lastMonth.net
                              },
                              {
                                label: 'This Month',
                                income: monthlyComparison.thisMonth.income,
                                expense: monthlyComparison.thisMonth.expense,
                                net: monthlyComparison.thisMonth.net
                              }
                            ]
                            : [];
                    })()
                  }
                  positiveColor={t.success}
                  negativeColor={t.danger}
                  textColor={t.textPrimary}
                  backgroundColor={t.card}
                  formatCurrency={(amount) => abbreviateNumber(amount)}
                />
              </View>
            </View>
          )
        )}

        {/* SECTION 4: 7-DAY TREND */}
        {isLoading ? (
          selectedMetricsPeriod === '7days' && <ChartSkeleton height={250} titleWidth={150} />
        ) : (
          selectedMetricsPeriod === '7days' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>7-Day Spending</Text>

              <View style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                padding: 16,
                ...shadows.sm
              }}>
                <SevenDayTrendChart
                  data={sevenDayTrend}
                  color={t.primary}
                  textColor={t.textPrimary}
                  backgroundColor={t.card}
                  gridColor={t.border}
                  formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
                />
              </View>
            </View>
          )
        )}

        {/* SECTION 5: CATEGORY BREAKDOWN (Horizontal Bar Chart) */}
        {isLoading ? (
          <ChartSkeleton height={300} titleWidth={200} />
        ) : (
          chartData.length > 0 ? (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
                {selectedMetricsPeriod === '7days' ? 'Spending by Category (7D)' : selectedMetricsPeriod === '30days' ? 'Spending by Category (30D)' : selectedMetricsPeriod === '3months' ? 'Spending by Category (3M)' : 'Spending by Category (6M)'}
              </Text>

              <View style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                padding: 16,
                ...shadows.sm
              }}>

                <HorizontalBarChart
                  data={
                    (showAllCategories ? chartData : chartData.slice(0, 5)).map((cat, index) => ({
                      category: cat.category,
                      total: cat.total,
                      percentage: cat.percentage,
                      color: categoryColorMap[cat.category] || fallbackColors[index % fallbackColors.length]
                    }))
                  }
                  textColor={t.textPrimary}
                  backgroundColor={t.card}
                  formatCurrency={(amount) => abbreviateNumber(amount)}
                  onCategoryPress={handleCategoryClick}
                />

                {chartData.length > 5 && (
                  <TouchableOpacity
                    onPress={() => setShowAllCategories(!showAllCategories)}
                    style={{
                      marginTop: 16,
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderTopWidth: 1,
                      borderTopColor: t.border
                    }}
                  >
                    <Text style={{ color: t.primary, fontWeight: '600', fontSize: 14 }}>
                      {showAllCategories ? 'Show Less' : `Show ${chartData.length - 5} More`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null
        )}

        {/* SECTION 5.5: BUDGETS & GOALS */}
        {isLoading ? (
          <View>
            <ChartSkeleton height={150} titleWidth={100} />
            <ChartSkeleton height={150} titleWidth={100} />
          </View>
        ) : (
          (budgets.length > 0 || goals.length > 0) && (
            <View style={{ marginBottom: 24 }}>
              {/* Budgets Section */}
              {budgets.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>
                      Budgets
                    </Text>
                    {budgets.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          const options = ['all', ...budgets.map(b => b.id)];
                          const currentIndex = options.indexOf(selectedBudgetId as any);
                          const nextIndex = (currentIndex + 1) % options.length;
                          setSelectedBudgetId(options[nextIndex]);
                        }}
                        style={{ backgroundColor: t.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: t.border }}
                      >
                        <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '700' }}>
                          {selectedBudgetId === 'all' ? 'All Budgets ▼' : budgets.find(b => b.id === selectedBudgetId)?.name + ' ▼'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {budgets
                    .filter(b => selectedBudgetId === 'all' || b.id === selectedBudgetId)
                    .map((budget) => (
                      <BudgetCard key={budget.id} budget={budget} />
                    ))}
                </View>
              )}

              {/* Goals Section */}
              {goals.length > 0 && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>
                      Goals
                    </Text>
                    {goals.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          const options = ['all', ...goals.map(g => g.id)];
                          const currentIndex = options.indexOf(selectedGoalId as any);
                          const nextIndex = (currentIndex + 1) % options.length;
                          setSelectedGoalId(options[nextIndex]);
                        }}
                        style={{ backgroundColor: t.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: t.border }}
                      >
                        <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '700' }}>
                          {selectedGoalId === 'all' ? 'All Goals ▼' : goals.find(g => g.id === selectedGoalId)?.name + ' ▼'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {goals
                    .filter(g => selectedGoalId === 'all' || g.id === selectedGoalId)
                    .map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                </View>
              )}
            </View>
          )
        )}

        {/* SECTION 6: FINANCIAL HEALTH & INSIGHTS (Removed from bottom) */}

      </ScrollView>

      {/* Phase 4: Category Drill-Down Modal */}
      <CategoryDrillDown
        visible={showCategoryDrillDown}
        category={selectedCategory}
        transactions={categoryTransactions}
        onClose={() => setShowCategoryDrillDown(false)}
        textColor={t.textPrimary}
        backgroundColor={t.background}
        cardColor={t.card}
        borderColor={t.border}
        formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
        formatDate={formatShortDate}
      />
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}
