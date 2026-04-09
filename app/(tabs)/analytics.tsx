import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity, useColorScheme, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, ThemeMode } from '../../src/theme/theme';
import { getTransactionsByCategory } from '../../src/lib/db/transactions';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { formatShortDate } from '../../src/utils/date';
import { invalidateTransactionCaches, invalidateWalletCaches } from '../../src/lib/cache/queryCache';
import SevenDayTrendChart from '../../src/components/charts/SevenDayTrendChart';
import CandlestickChart from '../../src/components/charts/CandlestickChart';
import HorizontalBarChart from '../../src/components/charts/HorizontalBarChart';
import TimePeriodSelector, { TimePeriod } from '../../src/components/TimePeriodSelector';
import CategoryDrillDown from '../../src/components/CategoryDrillDown';
import {
  AnalyticsDashboardSnapshot,
  AnalyticsMetricsPeriod,
  getAnalyticsDashboardSnapshot,
  resolveAnalyticsMetricsPeriod,
} from '../../src/lib/insights/analyticsDashboard';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';

function abbreviateNumber(num: number): string {
  if (num < 999) return Math.round(num).toLocaleString('en-US');
  if (num < 1_000_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
}

export default function AnalyticsPage() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const [categories, setCategories] = useState<Array<{ category: string; total: number }>>([]);
  const [incomeByPeriod, setIncomeByPeriod] = useState<Record<AnalyticsMetricsPeriod, number>>({
    '7days': 0,
    '30days': 0,
    '3months': 0,
    '6months': 0,
  });
  const [spendingRateByPeriod, setSpendingRateByPeriod] = useState<Record<AnalyticsMetricsPeriod, number>>({
    '7days': 0,
    '30days': 0,
    '3months': 0,
    '6months': 0,
  });
  const [largestPurchaseByPeriod, setLargestPurchaseByPeriod] = useState<Record<AnalyticsMetricsPeriod, number>>({
    '7days': 0,
    '30days': 0,
    '3months': 0,
    '6months': 0,
  });
  const [incomeExpense, setIncomeExpense] = useState<AnalyticsDashboardSnapshot['incomeExpense'] | null>(null);
  const [sevenDayTrend, setSevenDayTrend] = useState<AnalyticsDashboardSnapshot['sevenDayTrend']>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<AnalyticsDashboardSnapshot['monthlyComparison']>(null);
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30days');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Array<{ id: number; amount: number; date: string; notes?: string }>>([]);
  const [showCategoryDrillDown, setShowCategoryDrillDown] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadRequestIdRef = useRef(0);
  const { alertConfig, dismissAlert } = useAlert();

  const loadData = useCallback(async (period: TimePeriod = '30days') => {
    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);

    try {
      if (Platform.OS === 'web') return;
      const snapshot = await getAnalyticsDashboardSnapshot(period);
      if (requestId !== loadRequestIdRef.current) return;

      setCategories(snapshot.breakdown);
      setIncomeByPeriod((prev) => ({ ...prev, [snapshot.analyticsPeriod]: snapshot.incomeForPeriod }));
      setSpendingRateByPeriod((prev) => ({ ...prev, [snapshot.analyticsPeriod]: snapshot.spendingForPeriod }));
      setLargestPurchaseByPeriod((prev) => ({ ...prev, [snapshot.analyticsPeriod]: snapshot.largestPurchaseForPeriod }));
      setIncomeExpense(snapshot.incomeExpense);
      setSevenDayTrend(snapshot.sevenDayTrend);
      setMonthlyComparison(snapshot.monthlyComparison);
      setCategoryColorMap(snapshot.categoryColorMap);
    } catch (error) {
      if (requestId === loadRequestIdRef.current) console.error('Failed to load analytics data:', error);
    } finally {
      if (requestId === loadRequestIdRef.current) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData(selectedPeriod);
    }, [loadData, selectedPeriod])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      invalidateTransactionCaches();
      invalidateWalletCaches();
      await loadData(selectedPeriod);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, selectedPeriod]);

  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
    setShowAllCategories(false);
  }, []);

  const handleCategoryClick = useCallback(async (category: string) => {
    if (Platform.OS !== 'web') {
      setSelectedCategory(category);
      const drilldownPeriod = resolveAnalyticsMetricsPeriod(selectedPeriod);
      const transactions = await getTransactionsByCategory(category, drilldownPeriod);
      setCategoryTransactions(transactions.map((t) => ({ ...t, notes: t.notes ?? undefined })));
      setShowCategoryDrillDown(true);
    }
  }, [selectedPeriod]);

  const selectedMetricsPeriod = resolveAnalyticsMetricsPeriod(selectedPeriod);
  const chartData = useMemo(() => {
    const total = categories.reduce((sum, cat) => sum + cat.total, 0);
    return categories.map((cat) => ({
      ...cat,
      percentage: total > 0 ? (cat.total / total) * 100 : 0,
    }));
  }, [categories]);

  const fallbackColors = ['#C1A12F', '#84670B', '#B3B09E', '#6B6658', '#332D23', '#8B7355', '#A67C52', '#D4AF37'];
  const net = (incomeExpense?.netSavings || 0);
  const quickScore = incomeExpense?.savingsRate || 0;
  const topCategories = chartData.slice(0, 5);

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.primary} colors={[t.primary]} />}
      >
        <View style={{ marginBottom: 16, paddingTop: 20 }}>
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Insights</Text>
          <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>A simple read on what came in, what went out, and what stands out.</Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          <TimePeriodSelector
            selectedPeriod={selectedPeriod}
            onSelectPeriod={handlePeriodChange}
            textColor={t.textPrimary}
            backgroundColor={t.card}
            primaryColor={t.primary}
            borderColor={t.border}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>NET FLOW</Text>
            <Text style={{ color: net >= 0 ? t.success : t.danger, fontSize: 22, fontWeight: '900', marginTop: 8 }}>
              {isLoading ? '...' : formatCurrency(net, defaultCurrency)}
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 6 }}>{quickScore.toFixed(1)}% savings rate</Text>
          </View>

          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>BIGGEST SPEND</Text>
            <Text style={{ color: t.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 8 }}>
              {isLoading ? '...' : formatCurrency(largestPurchaseByPeriod[selectedMetricsPeriod] || 0, defaultCurrency)}
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 6 }}>Largest single transaction</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>INCOME</Text>
            <Text style={{ color: t.success, fontSize: 20, fontWeight: '800', marginTop: 8 }}>
              {isLoading ? '...' : formatCurrency(incomeByPeriod[selectedMetricsPeriod] || 0, defaultCurrency)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>SPENDING</Text>
            <Text style={{ color: t.danger, fontSize: 20, fontWeight: '800', marginTop: 8 }}>
              {isLoading ? '...' : formatCurrency(spendingRateByPeriod[selectedMetricsPeriod] || 0, defaultCurrency)}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>
              {selectedMetricsPeriod === '7days' ? 'Spending trend' : 'Flow trend'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/transactions/history')}>
              <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>View entries</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Text style={{ color: t.textSecondary }}>Loading trend...</Text>
          ) : selectedMetricsPeriod === '7days' ? (
            <SevenDayTrendChart
              data={sevenDayTrend}
              color={t.primary}
              textColor={t.textPrimary}
              backgroundColor={t.card}
              gridColor={t.border}
              formatCurrency={(amount) => formatCurrency(amount, defaultCurrency)}
            />
          ) : (
            <CandlestickChart
              data={(() => {
                const now = new Date();
                return selectedMetricsPeriod === '3months' && monthlyComparison?.threeMonths
                  ? monthlyComparison.threeMonths.map((monthData: any, index: number) => ({
                      label: new Date(now.getFullYear(), now.getMonth() - (2 - index), 1).toLocaleString('default', { month: 'short' }),
                      income: monthData.income,
                      expense: monthData.expense,
                      net: monthData.net,
                    }))
                  : selectedMetricsPeriod === '6months' && monthlyComparison?.sixMonths
                    ? monthlyComparison.sixMonths.map((monthData: any, index: number) => ({
                        label: new Date(now.getFullYear(), now.getMonth() - (5 - index), 1).toLocaleString('default', { month: 'short' }),
                        income: monthData.income,
                        expense: monthData.expense,
                        net: monthData.net,
                      }))
                    : selectedMetricsPeriod === '30days' && monthlyComparison?.thisMonth && monthlyComparison?.lastMonth
                      ? [
                          {
                            label: 'Last Month',
                            income: monthlyComparison.lastMonth.income,
                            expense: monthlyComparison.lastMonth.expense,
                            net: monthlyComparison.lastMonth.net,
                          },
                          {
                            label: 'This Month',
                            income: monthlyComparison.thisMonth.income,
                            expense: monthlyComparison.thisMonth.expense,
                            net: monthlyComparison.thisMonth.net,
                          },
                        ]
                      : [];
              })()}
              positiveColor={t.success}
              negativeColor={t.danger}
              textColor={t.textPrimary}
              backgroundColor={t.card}
              formatCurrency={(amount) => abbreviateNumber(amount)}
            />
          )}
        </View>

        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Top categories</Text>
            {chartData.length > 5 && (
              <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)}>
                <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>{showAllCategories ? 'Show less' : 'Show more'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <Text style={{ color: t.textSecondary }}>Loading categories...</Text>
          ) : chartData.length > 0 ? (
            <>
              <HorizontalBarChart
                data={(showAllCategories ? chartData : topCategories).map((cat, index) => ({
                  category: cat.category,
                  total: cat.total,
                  percentage: cat.percentage,
                  color: categoryColorMap[cat.category] || fallbackColors[index % fallbackColors.length],
                }))}
                textColor={t.textPrimary}
                backgroundColor={t.card}
                formatCurrency={(amount) => abbreviateNumber(amount)}
                onCategoryPress={handleCategoryClick}
              />

              <View style={{ marginTop: 16, gap: 8 }}>
                {(showAllCategories ? chartData : topCategories).map((cat) => (
                  <TouchableOpacity
                    key={cat.category}
                    onPress={() => router.push({ pathname: '/transactions/history', params: { category: cat.category } })}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: t.background,
                      borderWidth: 1,
                      borderColor: t.border,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>{cat.category}</Text>
                    <Text style={{ color: t.textSecondary, fontSize: 13 }}>{formatCurrency(cat.total, defaultCurrency)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ color: t.textSecondary }}>No category insights yet.</Text>
          )}
        </View>
      </ScrollView>

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
        themeMode={(themeMode === 'dark-teal' ? 'dark' : themeMode) as Exclude<ThemeMode, 'dark-teal'>}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}
