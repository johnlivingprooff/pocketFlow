import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions, Platform, TouchableOpacity, useColorScheme } from 'react-native';
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
  getAveragePurchaseSize
} from '../../src/lib/db/transactions';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { formatDate } from '../../src/utils/date';
import { Link } from 'expo-router';

export default function AnalyticsPage() {
  const { themeMode, defaultCurrency } = useSettings();
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
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Analytics</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Track your spending patterns</Text>
          </View>
          <Link href="/profile" asChild>
            <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center', ...shadows.sm }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>U</Text>
            </TouchableOpacity>
          </Link>
        </View>

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
          {weekComparison && (
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
                {weekComparison.change > 0 ? 'Up' : weekComparison.change < 0 ? 'Down' : 'Same'} <Text style={{ fontWeight: '700', color: weekComparison.change > 0 ? t.danger : weekComparison.change < 0 ? t.success : t.textPrimary }}>{Math.abs(weekComparison.change).toFixed(1)}%</Text> from last week
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                This week: {formatCurrency(weekComparison.thisWeek, defaultCurrency)} • Last week: {formatCurrency(weekComparison.lastWeek, defaultCurrency)}
              </Text>
            </View>
          )}

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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Day {monthProgress.currentDay} of {monthProgress.daysInMonth}</Text>
                <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>{monthProgress.progressPercentage.toFixed(0)}%</Text>
              </View>
              <View style={{
                height: 8,
                backgroundColor: t.background,
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 8
              }}>
                <View style={{
                  height: '100%',
                  width: `${monthProgress.progressPercentage}%`,
                  backgroundColor: t.primary
                }} />
              </View>
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>
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

        {/* Category Breakdown */}
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
              <View key={item.category} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{item.category}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 14 }}>
                    {formatCurrency(item.total, defaultCurrency)} ({item.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View style={{
                  height: 8,
                  backgroundColor: t.background,
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${item.percentage}%`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  />
                </View>
              </View>
            ))}

            {chartData.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>📊</Text>
                <Text style={{ color: t.textSecondary, fontSize: 14 }}>No data available yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Monthly Spending Chart Placeholder */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Monthly Spending</Text>
          
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16,
            height: 200,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>📈</Text>
            <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>
              Chart visualization coming soon
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Daily spending trends will be displayed here
            </Text>
          </View>
        </View>
    </ScrollView>
    </SafeAreaView>
  );
}
