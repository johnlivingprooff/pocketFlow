import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions, Platform, TouchableOpacity, useColorScheme, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { 
  monthSpend, 
  todaySpend, 
  categoryBreakdown,
  weekOverWeekComparison,
  incomeVsExpenseAnalysis,
  getSpendingStreak,
  getMonthProgress,
  getTopSpendingDay,
  getTransactionCounts,
  getAveragePurchaseSize,
  getSevenDaySpendingTrend,
  getDailySpendingForMonth,
  getMonthlyComparison,
  getCategorySpendingForPieChart,
  getSpendingTrendForPeriod,
  getCategorySpendingForPeriod,
  getTransactionsByCategory
} from '../../src/lib/db/transactions';
import { getCategories } from '../../src/lib/db/categories';
import { formatCurrency, formatLargeNumber } from '../../src/utils/formatCurrency';
import { formatShortDate } from '../../src/utils/date';
import { Link } from 'expo-router';
import { invalidateTransactionCaches, invalidateWalletCaches } from '../../src/lib/cache/queryCache';
import SevenDayTrendChart from '../../src/components/charts/SevenDayTrendChart';
import MonthlyBarChart from '../../src/components/charts/MonthlyBarChart';
import IncomeExpenseChart from '../../src/components/charts/IncomeExpenseChart';
import CategoryPieChart from '../../src/components/charts/CategoryPieChart';
import CandlestickChart from '../../src/components/charts/CandlestickChart';
import HorizontalBarChart from '../../src/components/charts/HorizontalBarChart';
import AnimatedProgressBar from '../../src/components/charts/AnimatedProgressBar';
import TimePeriodSelector, { TimePeriod } from '../../src/components/TimePeriodSelector';
import CategoryDrillDown from '../../src/components/CategoryDrillDown';
import HelpIcon from '../../src/components/HelpIcon';
import FinancialHealthRing from '../../src/components/FinancialHealthRing';
import {
  calculateFinancialHealthScore,
  FinancialHealthScore
} from '../../src/lib/insights/analyticsInsights';
import { exportAnalyticsReport, AnalyticsReportData } from '../../src/lib/export/exportReport';

export default function AnalyticsPage() {
  const { themeMode, defaultCurrency, userInfo } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [monthTotal, setMonthTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [categories, setCategories] = useState<Array<{ category: string; total: number }>>([]);
  const [largestPurchase, setLargestPurchase] = useState(0);
  const [avgDailySpend, setAvgDailySpend] = useState(0);
  
  // Phase 1: Enhanced Analytics State
  const [weekComparison, setWeekComparison] = useState<{ thisWeek: number; lastWeek: number; change: number } | null>(null);
  const [incomeExpense, setIncomeExpense] = useState<{ income: number; expense: number; netSavings: number; savingsRate: number } | null>(null);
  const [incomeExpensePeriod, setIncomeExpensePeriod] = useState<'current' | 'last'>('current');
  const [spendingStreak, setSpendingStreak] = useState<{ currentStreak: number; longestStreak: number; lastSpendDate: string | null } | null>(null);
  const [monthProgress, setMonthProgress] = useState<{ currentDay: number; daysInMonth: number; progressPercentage: number; daysRemaining: number } | null>(null);
  const [topSpendingDay, setTopSpendingDay] = useState<{ date: string; total: number } | null>(null);
  const [transactionCounts, setTransactionCounts] = useState<{ incomeCount: number; expenseCount: number; total: number } | null>(null);
  const [avgPurchase, setAvgPurchase] = useState<{ average: number; count: number } | null>(null);

  // Phase 2: Chart Data State
  const [sevenDayTrend, setSevenDayTrend] = useState<Array<{ date: string; amount: number }>>([]);
  const [dailySpending, setDailySpending] = useState<Array<{ day: number; amount: number }>>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any>(null);
  const [categoryPieData, setCategoryPieData] = useState<Array<{ category: string; total: number }>>([]);
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({});

  // Phase 3: Insights & Financial Health State
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthScore | null>(null);

  // Phase 4: Interactivity & Customization State
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Array<{ id: number; amount: number; date: string; notes?: string }>>([]);
  const [showCategoryDrillDown, setShowCategoryDrillDown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const month = await monthSpend();
      const today = await todaySpend();
      const breakdown = await categoryBreakdown();
      
      setMonthTotal(month);
      setTodayTotal(today);
      setCategories(breakdown);
      
      // Calculate average daily spend (simplified)
      const daysInMonth = new Date().getDate();
      setAvgDailySpend(month / daysInMonth);
      
      // Find largest purchase (simplified - using category totals)
      const largest = Math.max(...breakdown.map(c => c.total), 0);
      setLargestPurchase(largest);

      // Phase 1: Load enhanced analytics
      const weekComp = await weekOverWeekComparison();
      setWeekComparison(weekComp);

      const incExpAnalysis = await incomeVsExpenseAnalysis(incomeExpensePeriod);
      setIncomeExpense(incExpAnalysis);

      const streak = await getSpendingStreak();
      setSpendingStreak(streak);

      const progress = await getMonthProgress();
      setMonthProgress(progress);

      const topDay = await getTopSpendingDay();
      setTopSpendingDay(topDay);

      const counts = await getTransactionCounts();
      setTransactionCounts(counts);

      const avgPurch = await getAveragePurchaseSize();
      setAvgPurchase(avgPurch);

      // Phase 2: Load chart data
      const sevenDay = await getSevenDaySpendingTrend();
      setSevenDayTrend(sevenDay);

      const daily = await getDailySpendingForMonth();
      setDailySpending(daily);

      const comparison = await getMonthlyComparison();
      setMonthlyComparison(comparison);

      const pieData = await getCategorySpendingForPieChart();
      setCategoryPieData(pieData);

      // Fetch category colors
      const allCategories = await getCategories();
      const colorMap: Record<string, string> = {};
      allCategories.forEach(cat => {
        if (cat.name && cat.color) {
          colorMap[cat.name] = cat.color;
        }
      });
      setCategoryColorMap(colorMap);

      // Phase 3: Generate insights and financial health score
      const healthScore = calculateFinancialHealthScore({
        incomeExpense: incExpAnalysis,
        spendingStreak: streak,
        weekComparison: weekComp,
        dailySpending: daily
      });
      setFinancialHealth(healthScore);
    }
  }, [incomeExpensePeriod]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear all caches to force fresh analytics data
      invalidateTransactionCaches();
      invalidateWalletCaches();
      await loadData();
      console.log('Analytics refreshed - all caches cleared');
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Handle income vs expense period toggle
  const handleIncomeExpensePeriodChange = useCallback(async (period: 'current' | 'last') => {
    setIncomeExpensePeriod(period);
    if (Platform.OS !== 'web') {
      const incExpAnalysis = await incomeVsExpenseAnalysis(period);
      setIncomeExpense(incExpAnalysis);
    }
  }, []);

  // Phase 4: Handle period change
  const handlePeriodChange = useCallback(async (period: TimePeriod) => {
    setSelectedPeriod(period);
    if (Platform.OS !== 'web') {
      // Reload all analytics for the selected period (except 7-day trend which is fixed)
      const categoryData = await getCategorySpendingForPeriod(period);
      setCategoryPieData(categoryData);
      
      // Reload period-specific data
      const month = await monthSpend();
      const today = await todaySpend();
      const breakdown = await categoryBreakdown();
      
      setMonthTotal(month);
      setTodayTotal(today);
      setCategories(breakdown);
      
      const daysInMonth = new Date().getDate();
      setAvgDailySpend(month / daysInMonth);
      const largest = Math.max(...breakdown.map(c => c.total), 0);
      setLargestPurchase(largest);

      const weekComp = await weekOverWeekComparison();
      setWeekComparison(weekComp);

      const incExpAnalysis = await incomeVsExpenseAnalysis(incomeExpensePeriod);
      setIncomeExpense(incExpAnalysis);

      const streak = await getSpendingStreak();
      setSpendingStreak(streak);

      const progress = await getMonthProgress();
      setMonthProgress(progress);

      const topDay = await getTopSpendingDay();
      setTopSpendingDay(topDay);

      const counts = await getTransactionCounts();
      setTransactionCounts(counts);

      const avgPurch = await getAveragePurchaseSize();
      setAvgPurchase(avgPurch);

      const daily = await getDailySpendingForMonth();
      setDailySpending(daily);

      const comparison = await getMonthlyComparison();
      setMonthlyComparison(comparison);

      // Regenerate insights with updated data
      const healthScore = calculateFinancialHealthScore({
        incomeExpense: incExpAnalysis,
        spendingStreak: streak,
        weekComparison: weekComp,
        dailySpending: daily
      });
      setFinancialHealth(healthScore);
    }
  }, [incomeExpensePeriod]);

  // Phase 4: Handle category drill-down
  const handleCategoryClick = useCallback(async (category: string) => {
    if (Platform.OS !== 'web') {
      setSelectedCategory(category);
      const transactions = await getTransactionsByCategory(category, selectedPeriod);
      // Map null notes to undefined to match the component's type
      setCategoryTransactions(transactions.map(t => ({ ...t, notes: t.notes ?? undefined })));
      setShowCategoryDrillDown(true);
    }
  }, [selectedPeriod]);

  // Phase 4: Handle export
  const handleExport = useCallback(async () => {
    const reportData: AnalyticsReportData = {
      generatedAt: new Date().toISOString(),
      period: selectedPeriod,
      summary: {
        totalIncome: incomeExpense?.income ?? 0,
        totalExpense: incomeExpense?.expense ?? 0,
        netSavings: incomeExpense?.netSavings ?? 0,
        savingsRate: incomeExpense?.savingsRate ?? 0,
      },
      categories: categoryPieData.map(cat => ({
        category: cat.category,
        total: cat.total,
        percentage: (cat.total / categoryPieData.reduce((sum, c) => sum + c.total, 0)) * 100,
      })),
      financialHealth: financialHealth ? {
        score: financialHealth.score,
        rating: financialHealth.rating,
      } : undefined,
    };

    const result = await exportAnalyticsReport(reportData, 'txt');
    if (!result.success && result.error) {
      Alert.alert('Export Failed', result.error);
    }
  }, [selectedPeriod, incomeExpense, categoryPieData, financialHealth]);

  const topCategory = categories.length > 0 ? categories[0] : null;
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  // Calculate pie chart segments
  const total = categories.reduce((sum, cat) => sum + cat.total, 0);
  const chartData = categories.map(cat => ({
    ...cat,
    percentage: total > 0 ? (cat.total / total) * 100 : 0
  }));

  // Use actual category colors, fallback to theme colors
  const fallbackColors = ['#C1A12F', '#84670B', '#B3B09E', '#6B6658', '#332D23', '#8B7355', '#A67C52', '#D4AF37'];

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
            <TouchableOpacity 
              onPress={handleExport}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center', ...shadows.sm }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 18 }}>📤</Text>
            </TouchableOpacity>
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
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Overview</Text>
          
          {/* Total Balance + Net Flow */}
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
                  <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>Net Flow [{defaultCurrency}]</Text>
                  <HelpIcon
                    onPress={() => Alert.alert(
                      'Net Flow',
                      'Your net savings for the month (income minus expenses). Positive values show you\'re saving money, while negative values indicate you\'re spending more than you earn.'
                    )}
                    color={t.textSecondary}
                  />
                </View>
                <Text style={{ color: incomeExpense.netSavings >= 0 ? t.success : t.danger, fontSize: 20, fontWeight: '800' }}>
                  {formatLargeNumber(incomeExpense.netSavings)}
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
                  <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>Income [{defaultCurrency}]</Text>
                  <HelpIcon
                    onPress={() => Alert.alert(
                      'Income',
                      'Total income received this month from all sources (salary, freelance, business, investments, gifts, etc.). This represents money coming into your accounts.'
                    )}
                    color={t.textSecondary}
                  />
                </View>
                <Text style={{ color: t.success, fontSize: 20, fontWeight: '800' }}>
                  {formatLargeNumber(incomeExpense.income)}
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>income this month</Text>
              </View>
            </View>
          )}

          {/* Daily Spend + Largest Purchase */}
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
                <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>Avg Daily [{defaultCurrency}]</Text>
                <HelpIcon
                  onPress={() => Alert.alert(
                    'Average Daily Spending',
                    'Your average daily spending rate. Calculated by dividing total monthly expenses by the number of days in the current month. Helps you understand your typical spending pace.'
                  )}
                  color={t.textSecondary}
                />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                {formatLargeNumber(avgDailySpend)}
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>spending rate</Text>
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
                <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>Top Spend [{defaultCurrency}]</Text>
                <HelpIcon
                  onPress={() => Alert.alert(
                    'Top Spend',
                    'The highest amount spent on a single transaction this month. Shows your largest purchase and helps identify major spending events.'
                  )}
                  color={t.textSecondary}
                />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                {formatLargeNumber(largestPurchase)}
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>single purchase</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: MONTH PROGRESS */}
        {monthProgress && (
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
        )}

        {/* SECTION 3: TRENDS (Forex-style Candlestick Chart) */}
        {monthlyComparison && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Monthly Trends</Text>
            
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 14,
              padding: 16,
              ...shadows.sm
            }}>
              <CandlestickChart
                data={[
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
                ]}
                positiveColor={t.success}
                negativeColor={t.danger}
                textColor={t.textPrimary}
                backgroundColor={t.card}
                formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
              />
            </View>
          </View>
        )}

        {/* SECTION 4: CATEGORY BREAKDOWN (Horizontal Bar Chart) */}
        {chartData.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Spending by Category</Text>
            
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 14,
              padding: 16,
              ...shadows.sm
            }}>
              {/* <HorizontalBarChart
                data={
                  chartData.map((cat, index) => ({
                    category: cat.category,
                    total: cat.total,
                    percentage: cat.percentage,
                    color: fallbackColors[index % fallbackColors.length]
                  }))
                }
                textColor={t.textPrimary}
                backgroundColor={t.card}
                formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
              /> */}
              <HorizontalBarChart
                data={
                  chartData.map((cat, index) => ({
                    category: cat.category,
                    total: cat.total,
                    percentage: cat.percentage,
                    color: fallbackColors[index % fallbackColors.length]
                  }))
                }
                textColor={t.textPrimary}
                backgroundColor={t.card}
                formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
              />
            </View>
          </View>
        ) : null}

        {/* SECTION 5: 7-DAY TREND */}
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

        {/* SECTION 6: FINANCIAL HEALTH & INSIGHTS */}
        {financialHealth && (
          <View style={{ marginBottom: 24 }}>
            <FinancialHealthRing
              healthScore={financialHealth}
              textColor={t.textPrimary}
              backgroundColor={t.card}
              primaryColor={t.primary}
            />
          </View>
        )}
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
    </SafeAreaView>
  );
}
