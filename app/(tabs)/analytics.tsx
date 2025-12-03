import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions, Platform, TouchableOpacity, useColorScheme, Image, Alert } from 'react-native';
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
import { formatCurrency } from '../../src/utils/formatCurrency';
import { formatDate } from '../../src/utils/date';
import { Link } from 'expo-router';
import SevenDayTrendChart from '../../src/components/charts/SevenDayTrendChart';
import MonthlyBarChart from '../../src/components/charts/MonthlyBarChart';
import IncomeExpenseChart from '../../src/components/charts/IncomeExpenseChart';
import CategoryPieChart from '../../src/components/charts/CategoryPieChart';
import AnimatedProgressBar from '../../src/components/charts/AnimatedProgressBar';
import InsightsSection from '../../src/components/InsightsSection';
import FinancialHealthCard from '../../src/components/FinancialHealthCard';
import TimePeriodSelector, { TimePeriod } from '../../src/components/TimePeriodSelector';
import CategoryDrillDown from '../../src/components/CategoryDrillDown';
import {
  generateSpendingInsights,
  generateSavingsSuggestions,
  detectSpendingPatterns,
  calculateFinancialHealthScore,
  SpendingInsight,
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

  // Phase 3: Insights & Financial Health State
  const [spendingInsights, setSpendingInsights] = useState<SpendingInsight[]>([]);
  const [savingsSuggestions, setSavingsSuggestions] = useState<SpendingInsight[]>([]);
  const [patterns, setPatterns] = useState<SpendingInsight[]>([]);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthScore | null>(null);

  // Phase 4: Interactivity & Customization State
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Array<{ id: number; amount: number; date: string; notes?: string }>>([]);
  const [showCategoryDrillDown, setShowCategoryDrillDown] = useState(false);

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

      const incExpAnalysis = await incomeVsExpenseAnalysis();
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

      // Phase 3: Generate insights and financial health score
      const insights = generateSpendingInsights({
        monthlyComparison: comparison,
        weekComparison: weekComp,
        incomeExpense: incExpAnalysis,
        spendingStreak: streak,
        categories: breakdown,
        avgDailySpend: month / daysInMonth
      });
      setSpendingInsights(insights);

      const suggestions = generateSavingsSuggestions({
        categories: breakdown,
        avgDailySpend: month / daysInMonth,
        incomeExpense: incExpAnalysis
      });
      setSavingsSuggestions(suggestions);

      const detectedPatterns = detectSpendingPatterns({
        dailySpending: daily,
        categories: breakdown
      });
      setPatterns(detectedPatterns);

      const healthScore = calculateFinancialHealthScore({
        incomeExpense: incExpAnalysis,
        spendingStreak: streak,
        weekComparison: weekComp,
        dailySpending: daily
      });
      setFinancialHealth(healthScore);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Phase 4: Handle period change
  const handlePeriodChange = useCallback(async (period: TimePeriod) => {
    setSelectedPeriod(period);
    if (Platform.OS !== 'web') {
      // Reload data for the selected period
      const trendData = await getSpendingTrendForPeriod(period);
      setSevenDayTrend(trendData);
      
      const categoryData = await getCategorySpendingForPeriod(period);
      setCategoryPieData(categoryData);
    }
  }, []);

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
      insights: [...spendingInsights, ...savingsSuggestions, ...patterns],
      financialHealth: financialHealth ? {
        score: financialHealth.score,
        rating: financialHealth.rating,
      } : undefined,
    };

    const result = await exportAnalyticsReport(reportData, 'txt');
    if (!result.success && result.error) {
      Alert.alert('Export Failed', result.error);
    }
  }, [selectedPeriod, incomeExpense, categoryPieData, spendingInsights, savingsSuggestions, patterns, financialHealth]);

  const topCategory = categories.length > 0 ? categories[0] : null;
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  // Calculate pie chart segments
  const total = categories.reduce((sum, cat) => sum + cat.total, 0);
  const chartData = categories.map(cat => ({
    ...cat,
    percentage: total > 0 ? (cat.total / total) * 100 : 0
  }));

  const colors = ['#C1A12F', '#84670B', '#B3B09E', '#6B6658', '#332D23', '#8B7355', '#A67C52', '#D4AF37'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 }}>
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Analytics</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Track your spending patterns</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Phase 4: Export Button */}
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

        {/* Phase 4: Time Period Selector */}
        <TimePeriodSelector
          selectedPeriod={selectedPeriod}
          onSelectPeriod={handlePeriodChange}
          textColor={t.textPrimary}
          backgroundColor={t.card}
          primaryColor={t.primary}
          borderColor={t.border}
        />

        {/* Insights Cards */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Insights</Text>
          
          {topCategory && (
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12
            }}>
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>TOP CATEGORY</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                Your highest spending category this month is <Text style={{ fontWeight: '700' }}>{topCategory.category}</Text>
              </Text>
            </View>
          )}

          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12
          }}>
            <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>DAILY AVERAGE</Text>
            <Text style={{ color: t.textPrimary, fontSize: 16 }}>
              You're spending an average of <Text style={{ fontWeight: '700' }}>{formatCurrency(avgDailySpend, defaultCurrency)}</Text> per day
            </Text>
          </View>

          {/* Phase 1: Week-over-Week Comparison */}
          {weekComparison && (() => {
            const changeDirection = weekComparison.change > 0 ? 'Up' : weekComparison.change < 0 ? 'Down' : 'Same';
            const changeColor = weekComparison.change > 0 ? t.danger : weekComparison.change < 0 ? t.success : t.textPrimary;
            
            return (
              <View style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12
              }}>
                <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>WEEK-OVER-WEEK</Text>
                <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                  {changeDirection} <Text style={{ fontWeight: '700', color: changeColor }}>{Math.abs(weekComparison.change).toFixed(1)}%</Text> from last week
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                  This week: {formatCurrency(weekComparison.thisWeek, defaultCurrency)} • Last week: {formatCurrency(weekComparison.lastWeek, defaultCurrency)}
                </Text>
              </View>
            );
          })()}

          {/* Phase 1: Income vs Expense */}
          {incomeExpense && incomeExpense.income > 0 && (
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12
            }}>
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>SAVINGS RATE</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                You're saving <Text style={{ fontWeight: '700', color: incomeExpense.savingsRate > 0 ? t.success : t.danger }}>{incomeExpense.savingsRate.toFixed(1)}%</Text> of your income
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                Net: {formatCurrency(incomeExpense.netSavings, defaultCurrency)} ({formatCurrency(incomeExpense.income, defaultCurrency)} - {formatCurrency(incomeExpense.expense, defaultCurrency)})
              </Text>
            </View>
          )}

          {/* Phase 1: Spending Streak */}
          {spendingStreak && spendingStreak.currentStreak > 0 && (
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12
            }}>
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>SPENDING STREAK</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                You've spent for <Text style={{ fontWeight: '700' }}>{spendingStreak.currentStreak} consecutive day{spendingStreak.currentStreak > 1 ? 's' : ''}</Text>
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                Longest streak: {spendingStreak.longestStreak} day{spendingStreak.longestStreak > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Phase 3: Financial Health Score */}
        {financialHealth && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Financial Health</Text>
            <FinancialHealthCard
              healthScore={financialHealth}
              textColor={t.textPrimary}
              backgroundColor={t.card}
              borderColor={t.border}
              primaryColor={t.primary}
            />
          </View>
        )}

        {/* Phase 3: AI-Powered Spending Insights */}
        <InsightsSection
          insights={spendingInsights}
          title="Smart Insights"
          textColor={t.textPrimary}
          backgroundColor={t.card}
          borderColor={t.border}
        />

        {/* Phase 3: Savings Suggestions */}
        <InsightsSection
          insights={savingsSuggestions}
          title="Savings Suggestions"
          textColor={t.textPrimary}
          backgroundColor={t.card}
          borderColor={t.border}
        />

        {/* Phase 3: Spending Patterns */}
        <InsightsSection
          insights={patterns}
          title="Spending Patterns"
          textColor={t.textPrimary}
          backgroundColor={t.card}
          borderColor={t.border}
        />

        {/* Phase 1: Month Progress & Stats */}
        {monthProgress && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Month Progress</Text>
            
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12
            }}>
              <AnimatedProgressBar
                progress={monthProgress.progressPercentage}
                label={`Day ${monthProgress.currentDay} of ${monthProgress.daysInMonth}`}
                value={`${monthProgress.progressPercentage.toFixed(0)}%`}
                color={t.primary}
                backgroundColor={t.background}
                textColor={t.textPrimary}
              />
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 8 }}>
                {monthProgress.daysRemaining} day{monthProgress.daysRemaining !== 1 ? 's' : ''} remaining this month
              </Text>
            </View>

            {/* Transaction Counts */}
            {transactionCounts && transactionCounts.total > 0 && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 12,
                  padding: 16
                }}>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Transactions</Text>
                  <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>{transactionCounts.total}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>
                    {transactionCounts.incomeCount} in • {transactionCounts.expenseCount} out
                  </Text>
                </View>

                {avgPurchase && avgPurchase.count > 0 && (
                  <View style={{
                    flex: 1,
                    backgroundColor: t.card,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 12,
                    padding: 16
                  }}>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Avg Purchase</Text>
                    <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>
                      {formatCurrency(avgPurchase.average, defaultCurrency)}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>
                      {avgPurchase.count} expense{avgPurchase.count > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Top Spending Day */}
            {topSpendingDay && (
              <View style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 12,
                padding: 16,
                marginTop: 12
              }}>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Biggest Spending Day</Text>
                <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                  {formatCurrency(topSpendingDay.total, defaultCurrency)}
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                  {formatDate(topSpendingDay.date)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Trends Cards */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Trends</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{
              flex: 1,
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16
            }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 8 }}>Avg Daily Spend</Text>
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                {formatCurrency(avgDailySpend, defaultCurrency)}
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16
            }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 8 }}>Largest Purchase</Text>
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                {formatCurrency(largestPurchase, defaultCurrency)}
              </Text>
            </View>
          </View>

          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 8 }}>Total This Month</Text>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>
              {formatCurrency(monthTotal, defaultCurrency)}
            </Text>
          </View>
        </View>

        {/* Phase 2: 7-Day Spending Trend Chart */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>7-Day Spending Trend</Text>
          
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
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

        {/* Phase 2: Daily Spending Bar Chart */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Daily Spending This Month</Text>
          
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            <MonthlyBarChart
              data={dailySpending}
              color={t.primary}
              textColor={t.textPrimary}
              gridColor={t.border}
              formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
            />
          </View>
        </View>

        {/* Phase 2: Income vs Expense Comparison */}
        {monthlyComparison && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Monthly Comparison</Text>
            
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16
            }}>
              <IncomeExpenseChart
                data={[
                  { income: monthlyComparison.thisMonth.income, expense: monthlyComparison.thisMonth.expense, label: 'This Month' },
                  { income: monthlyComparison.lastMonth.income, expense: monthlyComparison.lastMonth.expense, label: 'Last Month' }
                ]}
                incomeColor={t.success}
                expenseColor={t.danger}
                textColor={t.textPrimary}
                backgroundColor={t.card}
                formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
              />
            </View>
          </View>
        )}

        {/* Phase 2: Category Pie Chart */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Category Distribution</Text>
          
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            <CategoryPieChart
              data={categoryPieData.map(cat => ({
                category: cat.category,
                total: cat.total,
                percentage: 0 // Will be calculated in the component
              }))}
              colors={colors}
              textColor={t.textPrimary}
              formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
            />
          </View>
        </View>

        {/* Category Breakdown (keeping the old bar-style version) */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Category Breakdown</Text>
          
          {/* Simple Bar Chart */}
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            {chartData.map((item, index) => (
              <TouchableOpacity 
                key={item.category} 
                style={{ marginBottom: 16 }}
                onPress={() => handleCategoryClick(item.category)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{item.category}</Text>
                    <Text style={{ color: t.textSecondary, fontSize: 11, marginLeft: 6 }}>▸</Text>
                  </View>
                  <Text style={{ color: t.textSecondary, fontSize: 14 }}>
                    {formatCurrency(item.total, defaultCurrency)} ({item.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <AnimatedProgressBar
                  progress={item.percentage}
                  label=""
                  value=""
                  color={colors[index % colors.length]}
                  backgroundColor={t.background}
                  textColor={t.textPrimary}
                />
              </TouchableOpacity>
            ))}

            {chartData.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>📊</Text>
                <Text style={{ color: t.textSecondary, fontSize: 14 }}>No data available yet</Text>
              </View>
            )}
          </View>
        </View>
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
        formatDate={formatDate}
      />
    </SafeAreaView>
  );
}
