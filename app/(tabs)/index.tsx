import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity, Modal, useColorScheme, Image, RefreshControl, AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { Link } from 'expo-router';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useTransactions } from '../../src/lib/hooks/useTransactions';
import { exec } from '../../src/lib/db';
import { WalletCard } from '../../src/components/WalletCard';
import { DraggableWalletList } from '../../src/components/DraggableWalletList';
import { AddButton } from '../../src/components/AddButton';
import { IncomeExpenseLineChart } from '../../src/components/IncomeExpenseLineChart';
import { totalAvailableAcrossWallets, monthSpend, todaySpend, getWalletsOrderedByRecentActivity, getIncomeExpenseForPeriod, getTransactionsForPeriod } from '../../src/lib/db/transactions';
import { getCategories, Category } from '../../src/lib/db/categories';
import { formatShortDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { Transaction } from '../../src/types/transaction';
import { log } from '../../src/utils/logger';
import { invalidateTransactionCaches, invalidateWalletCaches } from '../../src/lib/cache/queryCache';

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

// Format full date with day of week
function formatFullDate(date: Date): string {
  const dayOfWeek = date.toLocaleString('default', { weekday: 'long' });
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${dayOfWeek} ${day}, ${month} ${year}`;
}

export default function Home() {
  const { themeMode, defaultCurrency, userInfo } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
    const { wallets, balances, refresh } = useWallets();
    // Build quick maps for wallet exchange rates
    const walletExchangeRate: Record<number, number> = Object.fromEntries(wallets.map(w => [w.id!, w.exchange_rate ?? 1.0]));
  const { transactions: recentTransactions } = useTransactions(0, 3); // Only for displaying recent transactions
  const [analyticsTransactions, setAnalyticsTransactions] = useState<Transaction[]>([]); // For analytics calculations
  const [upcomingTransactions, setUpcomingTransactions] = useState<Transaction[]>([]); // For upcoming recurring transactions
  const [total, setTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  // Derive display name from persisted settings
  const displayName = (userInfo?.name && userInfo.name.trim().length > 0) ? userInfo.name : 'User';
  const greeting = getGreeting();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [chartData, setChartData] = useState<Array<{ date: string; income: number; expense: number }>>([]);
  const [chartRange, setChartRange] = useState<'7d' | '3m' | '6m' | '1y'>('7d');
  const [weekComparison, setWeekComparison] = useState<{ thisWeek: number; lastWeek: number; percentChange: number } | null>(null);
  const [biggestCategory, setBiggestCategory] = useState<{ category: string; amount: number } | null>(null);
  const [recentOrder, setRecentOrder] = useState<number[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // Force re-render when data changes

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

  const getCategoryBreakdown = () => {
    // Filter expense transactions for the selected period using analyticsTransactions
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    switch (selectedPeriod) {
      case 'all':
        startDate = new Date(0); // Unix epoch start
        break;
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth': {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonthDate;
        endDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        break;
    }

    // Normalize bounds to include entire days
    const startOfPeriod = new Date(startDate);
    startOfPeriod.setHours(0, 0, 0, 0);
    const endOfPeriod = new Date(endDate);
    endOfPeriod.setHours(23, 59, 59, 999);

    const expenseTransactions = analyticsTransactions.filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && t.category !== 'Transfer' && txDate >= startOfPeriod && txDate <= endOfPeriod;
    });

    // Group by category and convert to default currency
    const categoryTotals: { [key: string]: number } = {};
    expenseTransactions.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const rate = walletExchangeRate[t.wallet_id] ?? 1.0;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount * rate);
    });

    // Calculate total expenses
    const totalExpenses = Object.values(categoryTotals).reduce((sum, amt) => sum + amt, 0);

    // Convert to array and sort by amount
    const categories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: getCategoryColor(category)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4); // Top 4 categories

    return categories;
  };

  const getCategoryColor = (category: string) => {
    const colors = [
      '#E74C3C', '#3498DB', '#F39C12', '#9B59B6', 
      '#1ABC9C', '#E67E22', '#34495E', '#16A085'
    ];
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Build time-series for the chart based on selected range
  function buildChartData(range: '7d' | '3m' | '6m' | '1y', txns: Transaction[]) {
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
      // Last 12 weeks (weekly aggregates)
      // Determine start of current week (Sunday start)
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay());
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(currentWeekStart.getDate() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const weekTx = txns.filter(t => {
          const d = new Date(t.date);
          return d >= weekStart && d < weekEnd;
        });
        const incomeSum = sumIncome(weekTx);
        const expenseSum = sumExpense(weekTx);
        result.push({ date: weekStart.toISOString(), income: incomeSum, expense: expenseSum });
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
    } else if (range === '1y') {
      // Last 12 months (monthly aggregates)
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let i = 11; i >= 0; i--) {
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
    if (Platform.OS !== 'web') {
      (async () => {
        // Fetch recent wallet activity order for dashboard carousel
        try {
          const order = await getWalletsOrderedByRecentActivity();
          setRecentOrder(order);
        } catch {}
        setTotal(await totalAvailableAcrossWallets());
        setMonthTotal(await monthSpend());
        setTodayTotal(await todaySpend());
        
        // Load all categories from database
        const cats = await getCategories('expense');
        setAllCategories(cats);
        
        // Determine the date range needed for fetching transactions
        // We need enough data for both the selected period and the chart range
        const now = new Date();
        
        // Calculate the earliest date we need based on chart range
        let chartStartDate: Date;
        switch (chartRange) {
          case '7d':
            chartStartDate = new Date(now);
            chartStartDate.setDate(now.getDate() - 7);
            break;
          case '3m':
            chartStartDate = new Date(now);
            chartStartDate.setDate(now.getDate() - (12 * 7)); // 12 weeks
            break;
          case '6m':
            chartStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            break;
          case '1y':
            chartStartDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
            break;
        }
        
        // Calculate the start date for the selected period
        let periodStartDate: Date;
        let periodEndDate: Date = now;
        
        switch (selectedPeriod) {
          case 'all':
            periodStartDate = new Date(0); // Unix epoch start
            break;
          case 'today':
            periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            const dayOfWeek = now.getDay();
            periodStartDate = new Date(now);
            periodStartDate.setDate(now.getDate() - dayOfWeek);
            periodStartDate.setHours(0, 0, 0, 0);
            break;
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
        
        // Use the earlier of the two start dates to fetch all needed transactions
        const fetchStartDate = selectedPeriod === 'all' 
          ? new Date(0) 
          : new Date(Math.min(chartStartDate.getTime(), periodStartDate.getTime()));
        fetchStartDate.setHours(0, 0, 0, 0);
        
        const fetchEndDate = new Date(Math.max(periodEndDate.getTime(), now.getTime()));
        fetchEndDate.setHours(23, 59, 59, 999);
        
        // Fetch all transactions needed for analytics and charts
        const allTxns = await getTransactionsForPeriod(fetchStartDate, fetchEndDate);
        setAnalyticsTransactions(allTxns);
        
        // Normalize period bounds to include entire days
        const startOfPeriod = new Date(periodStartDate);
        startOfPeriod.setHours(0, 0, 0, 0);
        const endOfPeriod = new Date(periodEndDate);
        endOfPeriod.setHours(23, 59, 59, 999);
        
        // Fetch income/expense totals from database for the selected period
        const periodTotals = await getIncomeExpenseForPeriod(startOfPeriod, endOfPeriod);
        setIncome(periodTotals.income);
        setExpenses(periodTotals.expense);

        // Build chart data for selected range using fetched transactions
        const data = buildChartData(chartRange, allTxns);
        setChartData(data);

        // Calculate week-over-week comparison using fetched transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfThisWeek = new Date(today);
        startOfThisWeek.setDate(today.getDate() - today.getDay());
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

        const thisWeekTxns = allTxns.filter(t => {
          const d = new Date(t.date);
          return d >= startOfThisWeek && d < today && t.type === 'expense' && t.category !== 'Transfer';
        });
        const lastWeekTxns = allTxns.filter(t => {
          const d = new Date(t.date);
          return d >= startOfLastWeek && d < startOfThisWeek && t.type === 'expense' && t.category !== 'Transfer';
        });
        
        const thisWeekTotal = thisWeekTxns.reduce((s, t) => {
          const rate = walletExchangeRate[t.wallet_id] ?? 1.0;
          return s + Math.abs(t.amount * rate);
        }, 0);
        const lastWeekTotal = lastWeekTxns.reduce((s, t) => {
          const rate = walletExchangeRate[t.wallet_id] ?? 1.0;
          return s + Math.abs(t.amount * rate);
        }, 0);
        const percentChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

        setWeekComparison({
          thisWeek: thisWeekTotal,
          lastWeek: lastWeekTotal,
          percentChange: Math.round(percentChange)
        });

        // Find biggest category today using fetched transactions
        const todayStart = new Date(today);
        const todayEnd = new Date(today);
        todayEnd.setDate(today.getDate() + 1);

        const todayTxns = allTxns.filter(t => {
          const d = new Date(t.date);
          return d >= todayStart && d < todayEnd && t.type === 'expense' && t.category !== 'Transfer';
        });
        
        const categoryTotals: { [key: string]: number } = {};
        todayTxns.forEach(t => {
          const cat = t.category || 'Uncategorized';
          const rate = walletExchangeRate[t.wallet_id] ?? 1.0;
          categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount * rate);
        });

        const biggest = Object.entries(categoryTotals)
          .sort(([, a], [, b]) => b - a)[0];

        if (biggest) {
          setBiggestCategory({ category: biggest[0], amount: biggest[1] });
        } else {
          setBiggestCategory(null);
        }
      })();
    }
  }, [wallets, selectedPeriod, customStartDate, customEndDate, chartRange, dataVersion]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear all caches to force fresh data fetch from database
      invalidateTransactionCaches();
      invalidateWalletCaches();
      
      // Refresh wallet data
      await refresh();
      
      // Re-trigger data loading with fresh database queries
      if (Platform.OS !== 'web') {
        const order = await getWalletsOrderedByRecentActivity();
        setRecentOrder(order);
        setTotal(await totalAvailableAcrossWallets());
        setMonthTotal(await monthSpend());
        setTodayTotal(await todaySpend());
      }
      
      // Increment dataVersion to force useEffect to re-run and reload all analytics
      setDataVersion(prev => prev + 1);
      
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

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 16, textAlign: 'center' }}>pocketFlow</Text>
        <Text style={{ color: t.textSecondary, fontSize: 16, textAlign: 'center', maxWidth: 400 }}>
          This app uses SQLite for offline storage and is designed for iOS and Android.
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
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 }}>
        <View>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{greeting}, {displayName} 👋</Text>
          <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Here's where your money is flowing today.</Text>
          <Text style={{ color: t.textTertiary, fontSize: 12, marginTop: 2 }}>{formatFullDate(new Date())}</Text>
        </View>
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

        {/* Total Balance Across Wallets */}
        {wallets.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600' }}>
              Available Balance Across Wallets:{' '}
              <Text style={{ color: t.textPrimary, fontWeight: '800' }}>
                {formatCurrency(
                  wallets.reduce((sum, w) => {
                    const balance = balances[w.id!] ?? 0;
                    const rate = w.exchange_rate ?? 1.0;
                    return sum + (balance * rate);
                  }, 0),
                  defaultCurrency
                )}
              </Text>
            </Text>
          </View>
        )}

        {/* Wallets Carousel (Scrollable Items) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 12 }}>
          {wallets.length === 0 ? (
            <Link href="/wallets/create" asChild>
              <TouchableOpacity style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 20,
                padding: 16,
                minWidth: 220,
                ...shadows.sm
              }}>
                <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Create your first wallet</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 6 }}>Tap to add a wallet and start tracking</Text>
              </TouchableOpacity>
            </Link>
          ) : (
            // Order wallets by recent activity
            (() => {
              const orderIndex: Record<number, number> = {};
              (recentOrder || []).forEach((id, idx) => { orderIndex[id] = idx; });
              const byRecent = wallets.slice().sort((a, b) => {
                const ai = orderIndex[a.id!] ?? Number.MAX_SAFE_INTEGER;
                const bi = orderIndex[b.id!] ?? Number.MAX_SAFE_INTEGER;
                if (ai !== bi) return ai - bi; // recent activity priority
                // Tiebreaker: manual display_order ASC
                const ad = (a.display_order ?? Number.MAX_SAFE_INTEGER);
                const bd = (b.display_order ?? Number.MAX_SAFE_INTEGER);
                if (ad !== bd) return ad - bd;
                // Final fallback: created_at DESC
                const aDate = new Date(a.created_at || 0).getTime();
                const bDate = new Date(b.created_at || 0).getTime();
                return bDate - aDate;
              });
              return byRecent.map((w: any) => (
              <Link key={w.id} href={`/wallets/${w.id}`} asChild>
                <TouchableOpacity>
                  <LinearGradient
                    colors={[t.primary, t.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 22,
                      padding: 16,
                      minWidth: 240,
                      ...shadows.md
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{w.name}</Text>
                    <Text style={{ color: t.primaryLight, fontSize: 12, marginTop: 4 }}>{w.currency}</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 8 }}>
                      {formatCurrency(balances[w.id!], w.currency || defaultCurrency)}
                    </Text>
                    {/* Mini indicator placeholder */}
                    <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
                      <View style={{ backgroundColor: t.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>+ this week</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
              ))
            })()
          )}
        </ScrollView>
        {/* Dots indicator */}
        {wallets.length > 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            {wallets.map((_: any, i: number) => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.textTertiary }} />
            ))}
          </View>
        )}

          {/* Removed extra draggable wallet list to keep original carousel */}

        {/* Time Period Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'today', 'week', 'month', 'lastMonth'] as TimePeriod[]).map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => {
                if (period === 'custom') {
                  setShowDatePicker(true);
                } else {
                  setSelectedPeriod(period);
                  setCustomStartDate(null);
                  setCustomEndDate(null);
                }
              }}
              style={{
                backgroundColor: selectedPeriod === period ? t.primary : t.card,
                borderWidth: 1,
                borderColor: selectedPeriod === period ? t.primary : t.border,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 16,
                alignItems: 'center',
                minWidth: 90
              }}
            >
              <Text style={{
                color: selectedPeriod === period ? '#FFFFFF' : t.textSecondary,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'capitalize'
              }}>
                {period === 'all' ? 'All Time' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : period === 'lastMonth' ? 'Last Month' : period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          </View>
        </ScrollView>

        {/* Analytics Cards - Income, Expenses, Net */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Income Card */}
          <View style={{ minWidth: 160, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Income ({defaultCurrency})</Text>
            <Text style={{ color: t.success, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>

          {/* Expenses Card */}
          <View style={{ minWidth: 160, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Expenses ({defaultCurrency})</Text>
            <Text style={{ color: t.danger, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{expenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>

          {/* Net Card */}
          <View style={{ minWidth: 160, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Net ({defaultCurrency})</Text>
            <Text style={{ color: income - expenses >= 0 ? t.success : t.danger, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{(income - expenses).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>
          </View>
        </ScrollView>

        {/* Upcoming Transactions */}
        {upcomingTransactions.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>Upcoming</Text>
              <Link href="/settings/recurring" asChild>
                <TouchableOpacity>
                  <Text style={{ color: t.accent, fontSize: 14 }}>Manage</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <View style={{ gap: 8 }}>
              {upcomingTransactions.slice(0, 3).map((tx, idx) => {
                const transactionWallet = wallets.find(w => w.id === tx.wallet_id);
                const transactionCurrency = transactionWallet?.currency || defaultCurrency;
                return (
                  <View key={idx} style={{ backgroundColor: t.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{tx.category || 'Transfer'}</Text>
                      <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Recurring • {tx.recurrence_frequency || 'N/A'}</Text>
                    </View>
                    <Text style={{ color: tx.type === 'income' ? t.success : t.danger, fontSize: 16, fontWeight: '700' }}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, transactionCurrency)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>Recent Activity</Text>
            <Link href="/transactions/history" asChild>
              <TouchableOpacity>
                <Text style={{ color: t.accent, fontSize: 14 }}>See All</Text>
              </TouchableOpacity>
            </Link>
          </View>
          {recentTransactions.slice(0, 3).map((transaction: any) => {
            const transactionWallet = wallets.find(w => w.id === transaction.wallet_id);
            const transactionCurrency = transactionWallet?.currency || defaultCurrency;
            return (
              <Link key={transaction.id} href={`/transactions/${transaction.id}`} asChild>
                <TouchableOpacity style={{ backgroundColor: t.card, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: t.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{getTransferLabel(transaction)}</Text>
                      <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{formatShortDate(transaction.date)}</Text>
                    </View>
                    <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>{formatCurrency(transaction.amount, transactionCurrency)}</Text>
                  </View>
                </TouchableOpacity>
              </Link>
            );
          })}
        </View>

        {/* Income vs Expense Trend */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>Trend</Text>
          </View>
          {/* Chart Range Filters */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {([
              { key: '7d', label: '7D' },
              { key: '3m', label: '3M' },
              { key: '6m', label: '6M' },
              { key: '1y', label: '1Y' },
            ] as Array<{ key: '7d' | '3m' | '6m' | '1y'; label: string }>).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setChartRange(key)}
                style={{
                  flex: 1,
                  backgroundColor: chartRange === key ? t.primary : t.card,
                  borderWidth: 1,
                  borderColor: chartRange === key ? t.primary : t.border,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: chartRange === key ? '#FFFFFF' : t.textSecondary,
                  fontSize: 12,
                  fontWeight: '700',
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
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

        {/* Insights Preview Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginBottom: 24 }}>
          <Link href="/analytics" asChild>
            <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, minWidth: 220, ...shadows.sm }}>
              {weekComparison ? (
                <>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    {weekComparison.percentChange < 0 ? 'Spending is lower this week' : 'Spending is higher this week'}
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>
                    {Math.abs(weekComparison.percentChange)}% {weekComparison.percentChange < 0 ? 'lower' : 'higher'} than last week
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>No spending data</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Start tracking transactions</Text>
                </>
              )}
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </ScrollView>

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
