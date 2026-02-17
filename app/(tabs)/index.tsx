import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity, Modal, useColorScheme, Image, RefreshControl, AppState, AppStateStatus } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { Link, router } from 'expo-router';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useTransactions } from '../../src/lib/hooks/useTransactions';
import { exec } from '../../src/lib/db';
import { IncomeExpenseLineChart } from '../../src/components/IncomeExpenseLineChart';
import { getWalletsOrderedByRecentActivity, getIncomeExpenseForPeriod, getTransactionsForPeriod } from '../../src/lib/db/transactions';
import { formatShortDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { Transaction } from '../../src/types/transaction';
import { log } from '../../src/utils/logger';
import { invalidateTransactionCaches, invalidateWalletCaches } from '../../src/lib/cache/queryCache';
import { EyeOffIcon, EyeIcon } from '../../src/assets/icons/EyeOffIcon';
import { WalletIcon, PlusIcon, ChartIcon, SettingsIcon } from '../../src/assets/icons/CategoryIcons';
import { FinancialHealthWidget } from '../../src/components/FinancialHealthWidget';
import { getActiveBudgets, calculateBudgetMetrics } from '../../src/lib/db/budgets';
import { getGoals, calculateGoalMetrics } from '../../src/lib/db/goals';
import { BudgetWithMetrics, GoalWithMetrics } from '../../src/types/goal';


type TimePeriod = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

function getTransferLabel(tx: any) {
  if (tx.category !== 'Transfer') return tx.category || 'Uncategorized';
  const notes = tx.notes || '';
  if (tx.type === 'expense') {
    const match = notes.match(/to ([^(]+)/i);
    if (match?.[1]) return `Transfer to ${match[1].trim()}`;
    return 'Transfer to wallet';
  }
  if (tx.type === 'income') {
    const match = notes.match(/from ([^(]+)/i);
    if (match?.[1]) return `Transfer from ${match[1].trim()}`;
    return 'Transfer from wallet';
  }
  return 'Transfer';
}

// Friendly time-of-day greeting helper
function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 22) return 'Good evening';
  return 'Hello';
}

function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case 'all':
      return 'All Time';
    case 'today':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'lastMonth':
      return 'Last Month';
    case 'custom':
      return 'Custom Range';
    default:
      return 'This Period';
  }
}

function getPeriodDayCount(
  period: TimePeriod,
  startDate: Date | null,
  endDate: Date | null,
  now: Date = new Date()
): number {
  if (period === 'today') return 1;
  if (period === 'week') return 7;
  if (period === 'month') return Math.max(1, now.getDate());
  if (period === 'lastMonth') {
    return new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (period === 'custom' && startDate && endDate) {
    const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }
  if (period === 'all') return 30;
  return 7;
}

// Skeleton Loader Component
const SkeletonLoader = () => {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 0 }}>
      {/* Header Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 }}>
        <View>
          <View style={{ height: 16, width: 120, backgroundColor: t.card, borderRadius: 4, marginBottom: 6, opacity: 0.5 }} />
          <View style={{ height: 13, width: 180, backgroundColor: t.card, borderRadius: 4, marginBottom: 4, opacity: 0.4 }} />
          <View style={{ height: 12, width: 100, backgroundColor: t.card, borderRadius: 4, opacity: 0.3 }} />
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.card, opacity: 0.5 }} />
      </View>

      {/* Privacy toggle */}
      <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ height: 12, width: 80, backgroundColor: t.card, borderRadius: 4, opacity: 0.4 }} />
        <View style={{ width: 32, height: 32, backgroundColor: t.card, borderRadius: 8, opacity: 0.5 }} />
      </View>

      {/* Total Balance */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ height: 13, width: 200, backgroundColor: t.card, borderRadius: 4, opacity: 0.5 }} />
      </View>

      {/* Wallets Carousel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{
            borderRadius: 22,
            padding: 16,
            minWidth: 240,
            backgroundColor: t.card,
            opacity: 0.7,
          }}>
            <View style={{ height: 16, width: 100, backgroundColor: t.border, borderRadius: 4, marginBottom: 4, opacity: 0.5 }} />
            <View style={{ height: 12, width: 60, backgroundColor: t.border, borderRadius: 4, marginBottom: 8, opacity: 0.4 }} />
            <View style={{ height: 24, width: 80, backgroundColor: t.border, borderRadius: 4, marginBottom: 8, opacity: 0.5 }} />
            <View style={{ height: 20, width: 60, backgroundColor: t.border, borderRadius: 12, opacity: 0.4 }} />
          </View>
        ))}
      </ScrollView>

      {/* Dots indicator */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.card, opacity: 0.5 }} />
        ))}
      </View>

      {/* Time Period Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ height: 40, width: 90, backgroundColor: t.card, borderRadius: 12, opacity: 0.5 }} />
          ))}
        </View>
      </ScrollView>

      {/* Analytics Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ minWidth: 160, backgroundColor: t.card, borderRadius: 16, padding: 14, opacity: 0.7 }}>
              <View style={{ height: 12, width: 80, backgroundColor: t.border, borderRadius: 4, marginBottom: 6, opacity: 0.5 }} />
              <View style={{ height: 18, width: 60, backgroundColor: t.border, borderRadius: 4, opacity: 0.5 }} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Recent Activity */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ height: 18, width: 120, backgroundColor: t.card, borderRadius: 4, opacity: 0.5 }} />
          <View style={{ height: 14, width: 50, backgroundColor: t.card, borderRadius: 4, opacity: 0.4 }} />
        </View>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ backgroundColor: t.card, padding: 12, borderRadius: 8, marginBottom: 8, opacity: 0.7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ height: 16, width: 100, backgroundColor: t.border, borderRadius: 4, marginBottom: 4, opacity: 0.5 }} />
                <View style={{ height: 12, width: 80, backgroundColor: t.border, borderRadius: 4, opacity: 0.4 }} />
              </View>
              <View style={{ height: 16, width: 60, backgroundColor: t.border, borderRadius: 4, opacity: 0.5 }} />
            </View>
          </View>
        ))}
      </View>

      {/* Trend Chart */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ height: 18, width: 60, backgroundColor: t.card, borderRadius: 4, opacity: 0.5 }} />
        </View>
        {/* Chart Range Filters */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flex: 1, height: 32, backgroundColor: t.card, borderRadius: 12, opacity: 0.5 }} />
          ))}
        </View>
        {/* Chart Placeholder */}
        <View style={{ height: 220, backgroundColor: t.card, borderRadius: 12, opacity: 0.7 }} />
      </View>

      {/* Quick Actions */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ height: 18, width: 120, backgroundColor: t.card, borderRadius: 4, marginBottom: 12, opacity: 0.5 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={{ backgroundColor: t.card, borderRadius: 16, padding: 12, minWidth: 100, alignItems: 'center', opacity: 0.7 }}>
              <View style={{ width: 20, height: 20, backgroundColor: t.border, borderRadius: 4, marginBottom: 6, opacity: 0.5 }} />
              <View style={{ height: 12, width: 60, backgroundColor: t.border, borderRadius: 4, opacity: 0.4 }} />
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

// Format full date with day of week

// Format full date with day of week
function formatFullDate(date: Date): string {
  const dayOfWeek = date.toLocaleString('default', { weekday: 'long' });
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${dayOfWeek} ${day}, ${month} ${year}`;
}

export default function Home() {
  const { themeMode, defaultCurrency, userInfo, hideBalances, setHideBalances } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { wallets, balances, refresh } = useWallets();
  const hasLoadedInitialDataRef = useRef(false);
  // Build quick maps for wallet exchange rates
  const walletExchangeRate: Record<number, number> = Object.fromEntries(wallets.map(w => [w.id!, w.exchange_rate ?? 1.0]));
  const { transactions: recentTransactions } = useTransactions(0, 3); // Only for displaying recent transactions
  const [upcomingTransactions, setUpcomingTransactions] = useState<Transaction[]>([]); // For upcoming recurring transactions
  // Derive display name from persisted settings
  const displayName = (userInfo?.name && userInfo.name.trim().length > 0) ? userInfo.name : 'pFlowr';
  const greeting = getGreeting();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [chartData, setChartData] = useState<Array<{ date: string; income: number; expense: number }>>([]);
  const [chartRange, setChartRange] = useState<'7d' | '3m' | '6m'>('7d');
  const [recentOrder, setRecentOrder] = useState<number[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // Force re-render when data changes
  const [isLoading, setIsLoading] = useState(true);
  const [activeBudgets, setActiveBudgets] = useState<BudgetWithMetrics[]>([]);
  const [goals, setGoals] = useState<GoalWithMetrics[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(true);

  // Wallet Actions Modal State
  const [selectedWalletForAction, setSelectedWalletForAction] = useState<any>(null);
  const [showWalletActionModal, setShowWalletActionModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const loadFinancialData = async () => {
    try {
      setBudgetLoading(true);

      const budgets = await getActiveBudgets();
      const budgetsWithMetrics = budgets.map(calculateBudgetMetrics);
      setActiveBudgets(budgetsWithMetrics);

      const rawGoals = await getGoals();
      const goalsWithMetrics = rawGoals.map(calculateGoalMetrics);
      setGoals(goalsWithMetrics);

    } catch (error) {
      console.error('Failed to load financial data', error);
    } finally {
      setBudgetLoading(false);
    }
  };

  // Load upcoming recurring transactions
  const loadUpcomingTransactions = async () => {
    try {
      const transactions = await exec<Transaction & { walletCurrency: string }>(
        `SELECT t.*, w.currency as walletCurrency FROM transactions t
         LEFT JOIN wallets w ON t.wallet_id = w.id
         WHERE t.is_recurring = 1 
         ORDER BY ABS(t.amount) DESC
         LIMIT 3`
      );
      setUpcomingTransactions(transactions || []);
    } catch (error) {
      console.error('Error loading upcoming transactions:', error);
      setUpcomingTransactions([]);
    }
  };

  useEffect(() => {
    loadUpcomingTransactions();
  }, [dataVersion]);

  const handleDateSelect = (date: Date) => {
    if (!customStartDate || (customStartDate && customEndDate)) {
      // First click or reset: set as start date
      setCustomStartDate(date);
      setCustomEndDate(null);
    } else if (customStartDate && !customEndDate) {
      // Second click: set as end date
      if (date >= customStartDate) {
        setCustomEndDate(date);
      } else {
        // If selected date is before start, swap them
        setCustomEndDate(customStartDate);
        setCustomStartDate(date);
      }
    }
  };

  // Build time-series for the chart based on selected range
  function buildChartData(range: '7d' | '3m' | '6m', txns: Transaction[]) {
    const result: Array<{ date: string; income: number; expense: number }> = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sumIncome = (transactions: Transaction[]) =>
      transactions
        .filter(t => t.type === 'income' && t.category !== 'Transfer')
        .reduce((s, t) => s + t.amount * (walletExchangeRate[t.wallet_id] ?? 1.0), 0);
    const sumExpense = (transactions: Transaction[]) =>
      transactions
        .filter(t => t.type === 'expense' && t.category !== 'Transfer')
        .reduce((s, t) => s + Math.abs(t.amount * (walletExchangeRate[t.wallet_id] ?? 1.0)), 0);

    if (range === '7d') {
      // Last 7 days (daily)
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(now.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const dayTx = txns.filter(t => {
          const d = new Date(t.date);
          return d >= dayStart && d < dayEnd;
        });
        const incomeSum = sumIncome(dayTx);
        const expenseSum = sumExpense(dayTx);
        result.push({ date: dayStart.toISOString(), income: incomeSum, expense: expenseSum });
      }
    } else if (range === '3m') {
      // Last 3 months (monthly aggregates)
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let i = 2; i >= 0; i--) {
        const monthStart = new Date(firstOfThisMonth.getFullYear(), firstOfThisMonth.getMonth() - i, 1);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

        const monthTx = txns.filter(t => {
          const d = new Date(t.date);
          return d >= monthStart && d < monthEnd;
        });
        const incomeSum = sumIncome(monthTx);
        const expenseSum = sumExpense(monthTx);
        result.push({ date: monthStart.toISOString(), income: incomeSum, expense: expenseSum });
      }
    } else if (range === '6m') {
      // Last 6 months (monthly aggregates)
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(firstOfThisMonth.getFullYear(), firstOfThisMonth.getMonth() - i, 1);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

        const monthTx = txns.filter(t => {
          const d = new Date(t.date);
          return d >= monthStart && d < monthEnd;
        });
        const incomeSum = sumIncome(monthTx);
        const expenseSum = sumExpense(monthTx);
        result.push({ date: monthStart.toISOString(), income: incomeSum, expense: expenseSum });
      }
    }

    return result;
  }

  useEffect(() => {
    const mappedRange: '7d' | '3m' | '6m' =
      selectedPeriod === 'today' || selectedPeriod === 'week'
        ? '7d'
        : selectedPeriod === 'month'
          ? '3m'
          : '6m';

    if (chartRange !== mappedRange) {
      setChartRange(mappedRange);
    }
  }, [selectedPeriod, chartRange]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let isCancelled = false;

    const loadDashboardData = async () => {
      try {
        if (!hasLoadedInitialDataRef.current) {
          setIsLoading(true);
        }

        const now = new Date();

        // Calculate the earliest date we need based on chart range
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

        // Calculate the start date for the selected period
        let periodStartDate: Date;
        let periodEndDate: Date = now;

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

        const startOfPeriod = new Date(periodStartDate);
        startOfPeriod.setHours(0, 0, 0, 0);
        const endOfPeriod = new Date(periodEndDate);
        endOfPeriod.setHours(23, 59, 59, 999);

        const financialDataPromise = loadFinancialData();

        const [order, allTxns, periodTotals] = await Promise.all([
          getWalletsOrderedByRecentActivity().catch(() => null),
          getTransactionsForPeriod(fetchStartDate, fetchEndDate),
          getIncomeExpenseForPeriod(startOfPeriod, endOfPeriod),
        ]);

        if (isCancelled) return;

        setRecentOrder(order);
        setIncome(periodTotals.income);
        setExpenses(periodTotals.expense);
        setChartData(buildChartData(chartRange, allTxns));

        await financialDataPromise;
      } catch (error) {
        console.error('Error loading home dashboard data:', error);
      } finally {
        if (!isCancelled) {
          hasLoadedInitialDataRef.current = true;
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isCancelled = true;
    };
  }, [wallets, selectedPeriod, customStartDate, customEndDate, chartRange, dataVersion]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear all caches to force fresh data fetch from database
      invalidateTransactionCaches();
      invalidateWalletCaches();

      // Refresh wallet data and upcoming recurring preview.
      // Dashboard analytics reloads when wallet state updates.
      await Promise.all([refresh(), loadUpcomingTransactions()]);

      console.log('Full refresh completed - all caches cleared and data reloaded');
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Listen to app state changes to reload data when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && Platform.OS !== 'web') {
        // App came to foreground - reload data to ensure fresh data is displayed
        // This is critical for release builds where cached data may be stale
        log('[Home] App became active, reloading data...');
        setDataVersion(prev => prev + 1);
      }
    });

    return () => subscription.remove();
  }, []);

  const handleWalletLongPress = (wallet: any) => {
    setSelectedWalletForAction(wallet);
    setShowWalletActionModal(true);
  };

  const handleModalEdit = () => {
    setShowWalletActionModal(false);
    if (selectedWalletForAction) {
      router.push({ pathname: '/wallets/edit', params: { id: String(selectedWalletForAction.id) } });
    }
  };

  const handleModalTransact = () => {
    setShowWalletActionModal(false);
    if (selectedWalletForAction) {
      router.push({ pathname: '/transactions/add', params: { walletId: String(selectedWalletForAction.id) } });
    }
  };

  const handleModalView = () => {
    setShowWalletActionModal(false);
    if (selectedWalletForAction) {
      router.push(`/wallets/${selectedWalletForAction.id}`);
    }
  };

  const now = new Date();
  const periodLabel = getPeriodLabel(selectedPeriod);
  const periodDayCount = getPeriodDayCount(selectedPeriod, customStartDate, customEndDate, now);
  const net = income - expenses;
  const dailyBurnRate = expenses / periodDayCount;
  const totalAvailableBalance = wallets.reduce((sum, w) => {
    const walletId = w.id;
    if (!walletId) return sum;
    const balance = balances[walletId] ?? 0;
    const rate = w.exchange_rate ?? 1.0;
    return sum + balance * rate;
  }, 0);

  const orderIndex: Record<number, number> = {};
  (recentOrder || []).forEach((id, idx) => {
    orderIndex[id] = idx;
  });
  const orderedWallets = wallets.slice().sort((a, b) => {
    const ai = orderIndex[a.id!] ?? Number.MAX_SAFE_INTEGER;
    const bi = orderIndex[b.id!] ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;

    const ad = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const bd = b.display_order ?? Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad - bd;

    const aDate = new Date(a.created_at || 0).getTime();
    const bDate = new Date(b.created_at || 0).getTime();
    return bDate - aDate;
  });

  const overBudgetCount = activeBudgets.filter((budget) => budget.isOverBudget).length;
  const nearBudgetLimitCount = activeBudgets.filter((budget) => !budget.isOverBudget && budget.percentageUsed >= 85).length;
  const overdueGoalCount = goals.filter((goal) => goal.daysRemaining < 0 && goal.progressPercentage < 100).length;
  const atRiskGoalCount = goals.filter((goal) => goal.daysRemaining >= 0 && goal.daysRemaining <= 30 && goal.progressPercentage < 75).length;
  const needsAttentionCount = overBudgetCount + nearBudgetLimitCount + overdueGoalCount + atRiskGoalCount;

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 16, textAlign: 'center' }}>pocketFlow</Text>
        <Text style={{ color: t.textSecondary, fontSize: 16, textAlign: 'center', maxWidth: 400 }}>
          This app uses Nitro SQLite for offline storage and is designed for iOS and Android.
        </Text>
        <Text style={{ color: t.textSecondary, fontSize: 16, textAlign: 'center', maxWidth: 400, marginTop: 16 }}>
          Please run the app on a mobile device or simulator using:
        </Text>
        <View style={{ backgroundColor: t.card, padding: 16, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ color: t.textPrimary, fontFamily: 'monospace' }}>npx expo start --ios</Text>
          <Text style={{ color: t.textPrimary, fontFamily: 'monospace', marginTop: 8 }}>npx expo start --android</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={t.primary}
              colors={[t.primary]}
            />
          }
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 }}>
            <View>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{greeting}, {displayName}.</Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>One glance, one decision.</Text>
              <Text style={{ color: t.textTertiary, fontSize: 12, marginTop: 2 }}>{formatFullDate(now)}</Text>
            </View>
            <Link href="/profile" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: t.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  borderWidth: 1.5,
                  borderColor: t.card
                }}
              >
                {userInfo?.profileImage && !imageError ? (
                  <Image
                    source={{ uri: userInfo.profileImage }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                      {(userInfo?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Link>
          </View>

          {/* Unified Period Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['today', 'week', 'month', 'lastMonth', 'all'] as TimePeriod[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  onPress={() => {
                    setSelectedPeriod(period);
                    setCustomStartDate(null);
                    setCustomEndDate(null);
                  }}
                  style={{
                    backgroundColor: selectedPeriod === period ? t.primary : t.card,
                    borderWidth: 1,
                    borderColor: selectedPeriod === period ? t.primary : t.border,
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    alignItems: 'center',
                    minWidth: 88
                  }}
                >
                  <Text style={{
                    color: selectedPeriod === period ? '#FFFFFF' : t.textSecondary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}>
                    {getPeriodLabel(period)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Primary Balance Card */}
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 18, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>Total Available</Text>
                <Text style={{ color: t.textPrimary, fontSize: 30, fontWeight: '900' }} numberOfLines={1}>
                  {hideBalances ? '******' : formatCurrency(totalAvailableBalance, defaultCurrency)}
                </Text>
                <Text style={{ color: net >= 0 ? t.success : t.danger, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                  {periodLabel} Net: {hideBalances ? '******' : formatCurrency(net, defaultCurrency)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setHideBalances(!hideBalances)}
                accessibilityRole="button"
                accessibilityLabel={hideBalances ? 'Show amounts' : 'Hide amounts'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 8, borderRadius: 10, backgroundColor: t.background, borderWidth: 1, borderColor: t.border }}
              >
                {hideBalances ? <EyeIcon size={18} color={t.textSecondary} /> : <EyeOffIcon size={18} color={t.textSecondary} />}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Link href="/transactions/add" asChild>
                <TouchableOpacity style={{ flex: 1, backgroundColor: t.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Add Transaction</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/analytics" asChild>
                <TouchableOpacity style={{ flex: 1, backgroundColor: t.background, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>Open Analytics</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* KPI Grid */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Overview</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <View style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>Income</Text>
                <Text style={{ color: t.success, fontSize: 18, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>
                  {hideBalances ? '******' : formatCurrency(income, defaultCurrency)}
                </Text>
              </View>

              <View style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>Expenses</Text>
                <Text style={{ color: t.danger, fontSize: 18, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>
                  {hideBalances ? '******' : formatCurrency(expenses, defaultCurrency)}
                </Text>
              </View>

              <View style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12 }}>
                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>Net</Text>
                <Text style={{ color: net >= 0 ? t.success : t.danger, fontSize: 18, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>
                  {hideBalances ? '******' : formatCurrency(net, defaultCurrency)}
                </Text>
              </View>

              <View style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12 }}>
                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>Daily Burn</Text>
                <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>
                  {hideBalances ? '******' : formatCurrency(dailyBurnRate, defaultCurrency)}
                </Text>
              </View>
            </View>
          </View>

          {/* Needs Attention */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Needs Attention</Text>
              <View style={{ backgroundColor: needsAttentionCount > 0 ? t.danger + '20' : t.success + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: needsAttentionCount > 0 ? t.danger : t.success, fontSize: 11, fontWeight: '800' }}>
                  {needsAttentionCount > 0 ? `${needsAttentionCount} alert${needsAttentionCount > 1 ? 's' : ''}` : 'All clear'}
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, gap: 8 }}>
              {budgetLoading ? (
                <Text style={{ color: t.textSecondary, fontSize: 13 }}>Checking your budgets and goals...</Text>
              ) : (
                <>
                  {overBudgetCount > 0 && (
                    <Link href="/budget" asChild>
                      <TouchableOpacity style={{ backgroundColor: t.danger + '10', borderWidth: 1, borderColor: t.danger + '30', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ color: t.danger, fontSize: 13, fontWeight: '800' }}>Over-budget categories</Text>
                          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{overBudgetCount} budget{overBudgetCount > 1 ? 's are' : ' is'} over limit.</Text>
                        </View>
                        <Text style={{ color: t.danger, fontWeight: '800' }}>Review</Text>
                      </TouchableOpacity>
                    </Link>
                  )}

                  {nearBudgetLimitCount > 0 && (
                    <Link href="/budget" asChild>
                      <TouchableOpacity style={{ backgroundColor: t.warning + '10', borderWidth: 1, borderColor: t.warning + '30', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ color: t.warning, fontSize: 13, fontWeight: '800' }}>Budget warning</Text>
                          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{nearBudgetLimitCount} budget{nearBudgetLimitCount > 1 ? 's are' : ' is'} at 85%+.</Text>
                        </View>
                        <Text style={{ color: t.warning, fontWeight: '800' }}>Check</Text>
                      </TouchableOpacity>
                    </Link>
                  )}

                  {(overdueGoalCount > 0 || atRiskGoalCount > 0) && (
                    <Link href="/budget" asChild>
                      <TouchableOpacity style={{ backgroundColor: t.primary + '10', borderWidth: 1, borderColor: t.primary + '30', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ color: t.primary, fontSize: 13, fontWeight: '800' }}>Goal deadlines approaching</Text>
                          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                            {overdueGoalCount > 0 ? `${overdueGoalCount} overdue` : ''}{overdueGoalCount > 0 && atRiskGoalCount > 0 ? ' · ' : ''}{atRiskGoalCount > 0 ? `${atRiskGoalCount} at risk` : ''}
                          </Text>
                        </View>
                        <Text style={{ color: t.primary, fontWeight: '800' }}>Open</Text>
                      </TouchableOpacity>
                    </Link>
                  )}

                  {upcomingTransactions.length > 0 && (
                    <Link href="/settings/recurring" asChild>
                      <TouchableOpacity style={{ backgroundColor: t.background, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '800' }}>Upcoming recurring payments</Text>
                          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{upcomingTransactions.length} scheduled item{upcomingTransactions.length > 1 ? 's' : ''} to review.</Text>
                        </View>
                        <Text style={{ color: t.textSecondary, fontWeight: '800' }}>Manage</Text>
                      </TouchableOpacity>
                    </Link>
                  )}

                  {needsAttentionCount === 0 && upcomingTransactions.length === 0 && (
                    <Text style={{ color: t.textSecondary, fontSize: 13 }}>No urgent items. Keep it up.</Text>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Recent Activity</Text>
              <Link href="/transactions/history" asChild>
                <TouchableOpacity>
                  <Text style={{ color: t.accent, fontSize: 14, fontWeight: '700' }}>See All</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {recentTransactions.length === 0 ? (
              <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14 }}>
                <Text style={{ color: t.textSecondary, fontSize: 13 }}>No transactions yet. Add your first entry to start insights.</Text>
              </View>
            ) : (
              recentTransactions.slice(0, 3).map((transaction: any) => {
                const transactionWallet = wallets.find(w => w.id === transaction.wallet_id);
                const transactionCurrency = transactionWallet?.currency || defaultCurrency;
                const isExpense = transaction.type === 'expense';
                const itemColor = isExpense ? t.danger : t.success;
                const itemBg = isExpense ? t.danger + '0D' : t.success + '0D';

                return (
                  <Link key={transaction.id} href={`/transactions/${transaction.id}`} asChild>
                    <TouchableOpacity style={{ backgroundColor: itemBg, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: itemColor + '30' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{getTransferLabel(transaction)}</Text>
                          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{formatShortDate(transaction.date)}</Text>
                        </View>
                        <Text style={{ color: itemColor, fontSize: 16, fontWeight: '800' }}>
                          {hideBalances ? '******' : formatCurrency(transaction.amount, transactionCurrency)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Link>
                );
              })
            )}
          </View>

          {/* Trend */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Trend</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '700' }}>{chartRange.toUpperCase()}</Text>
            </View>
            <IncomeExpenseLineChart
              data={chartData}
              height={220}
              textColor={t.textSecondary}
              backgroundColor={t.card}
              incomeColor={t.success}
              expenseColor={t.danger}
              gridColor={t.border}
            />
          </View>

          {/* Wallet Snapshot */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Wallets</Text>
              <Link href="/wallets" asChild>
                <TouchableOpacity>
                  <Text style={{ color: t.accent, fontSize: 14, fontWeight: '700' }}>View All</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {orderedWallets.length === 0 ? (
              <Link href="/wallets/create" asChild>
                <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800' }}>Create your first wallet</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Tap to start tracking balances.</Text>
                </TouchableOpacity>
              </Link>
            ) : (
              orderedWallets.slice(0, 3).map((wallet: any) => (
                <TouchableOpacity
                  key={wallet.id}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/wallets/${wallet.id}`)}
                  onLongPress={() => handleWalletLongPress(wallet)}
                  delayLongPress={500}
                  style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, marginBottom: 8 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>{wallet.name}</Text>
                      <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{wallet.currency} · {wallet.type || 'Wallet'}</Text>
                    </View>
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800' }}>
                      {hideBalances ? '******' : formatCurrency(balances[wallet.id!], wallet.currency || defaultCurrency)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Goals */}
          <View style={{ marginBottom: 24 }}>
            <FinancialHealthWidget
              type="goal"
              data={goals}
              isLoading={budgetLoading}
              hideBalances={hideBalances}
              colors={t}
            />
          </View>

          {/* Budgets */}
          <View style={{ marginBottom: 24 }}>
            <FinancialHealthWidget
              type="budget"
              data={activeBudgets}
              isLoading={budgetLoading}
              hideBalances={hideBalances}
              colors={t}
            />
          </View>

          {/* Quick Actions */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Quick Actions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <Link href="/transactions/add" asChild>
                <TouchableOpacity style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                  <PlusIcon size={20} color={t.primary} />
                  <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Add Transaction</Text>
                </TouchableOpacity>
              </Link>

              <Link href="/wallets" asChild>
                <TouchableOpacity style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                  <WalletIcon size={20} color={t.primary} />
                  <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Wallets</Text>
                </TouchableOpacity>
              </Link>

              <Link href="/budget" asChild>
                <TouchableOpacity style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, alignItems: 'center' }}>
                  <ChartIcon size={20} color={t.primary} />
                  <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Budgets & Goals</Text>
                </TouchableOpacity>
              </Link>

              <Link href="/settings" asChild>
                <TouchableOpacity style={{ width: '48.5%', backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, alignItems: 'center' }}>
                  <SettingsIcon size={20} color={t.primary} />
                  <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 6 }}>More</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Wallet Actions Modal */}
          <Modal
            visible={showWalletActionModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowWalletActionModal(false)}
          >
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 20 }}
              activeOpacity={1}
              onPress={() => setShowWalletActionModal(false)}
            >
              <View style={{ backgroundColor: t.card, borderRadius: 24, padding: 24, paddingBottom: 32, borderWidth: 1, borderColor: t.border }}>
                <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
                  {selectedWalletForAction?.name}
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 24 }}>
                  Quick Actions
                </Text>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={handleModalView}
                    style={{ backgroundColor: t.primary + '15', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 20 }}>👁</Text>
                    </View>
                    <View>
                      <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>View Details</Text>
                      <Text style={{ color: t.textSecondary, fontSize: 12 }}>See full history & stats</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleModalTransact}
                    style={{ backgroundColor: t.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.success, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 20 }}>＋</Text>
                    </View>
                    <View>
                      <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>Add Transaction</Text>
                      <Text style={{ color: t.textSecondary, fontSize: 12 }}>Quickly record spend/income</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleModalEdit}
                    style={{ backgroundColor: t.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.warning, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 18 }}>✎</Text>
                    </View>
                    <View>
                      <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>Edit Wallet</Text>
                      <Text style={{ color: t.textSecondary, fontSize: 12 }}>Change name or type</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setShowWalletActionModal(false)}
                  style={{ marginTop: 24, padding: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: t.textSecondary, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </ScrollView>
      )}

      {/* Custom Date Range Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPrimary }}>Select Date Range</Text>
              <TouchableOpacity onPress={() => {
                setShowDatePicker(false);
                setCustomStartDate(null);
                setCustomEndDate(null);
              }}>
                <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Date Range Display */}
            <View style={{ padding: 16, backgroundColor: t.background, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Start Date</Text>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>
                    {customStartDate ? customStartDate.toLocaleDateString() : 'Select date'}
                  </Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 18, marginHorizontal: 12 }}>→</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>End Date</Text>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>
                    {customEndDate ? customEndDate.toLocaleDateString() : 'Select date'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Calendar Grid */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
              {generateCalendarMonths().map((month, monthIdx) => (
                <View key={monthIdx} style={{ marginBottom: 24 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    {month.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {month.days.map((day, dayIdx) => {
                      const isStart = customStartDate && day.date.toDateString() === customStartDate.toDateString();
                      const isEnd = customEndDate && day.date.toDateString() === customEndDate.toDateString();
                      const isInRange = customStartDate && customEndDate && day.date >= customStartDate && day.date <= customEndDate;
                      const isPast = day.date > new Date();

                      return (
                        <TouchableOpacity
                          key={dayIdx}
                          disabled={isPast}
                          onPress={() => handleDateSelect(day.date)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isStart || isEnd ? t.primary : isInRange ? t.card : isPast ? t.background : t.card,
                            borderWidth: 1,
                            borderColor: isStart || isEnd ? t.primary : isInRange ? t.primary : t.border
                          }}
                        >
                          <Text style={{
                            color: isStart || isEnd ? '#FFFFFF' : isPast ? t.textTertiary : isInRange ? t.primary : t.textPrimary,
                            fontSize: 14,
                            fontWeight: isStart || isEnd ? '800' : '600'
                          }}>
                            {day.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Apply Button */}
            {customStartDate && customEndDate && (
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.border }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPeriod('custom');
                    setShowDatePicker(false);
                  }}
                  style={{
                    backgroundColor: t.primary,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    ...shadows.sm
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Apply Date Range</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper function to generate calendar months
function generateCalendarMonths() {
  const months = [];
  const today = new Date();

  // Generate last 6 months including current month
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        date: new Date(date.getFullYear(), date.getMonth(), day)
      });
    }

    months.push({ name: monthName, days });
  }

  return months;
}
