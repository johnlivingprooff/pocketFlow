import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity, Modal, useColorScheme, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { Link } from 'expo-router';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useTransactions } from '../../src/lib/hooks/useTransactions';
import { WalletCard } from '../../src/components/WalletCard';
import { AddButton } from '../../src/components/AddButton';
import { totalAvailableAcrossWallets, monthSpend, todaySpend } from '../../src/lib/db/transactions';
import { getCategories, Category } from '../../src/lib/db/categories';
import { formatDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';

type TimePeriod = 'today' | 'week' | 'month' | 'custom';

// Friendly time-of-day greeting helper
function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 22) return 'Good evening';
  return 'Hello';
}

export default function Home() {
  const { themeMode, defaultCurrency, userInfo } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { wallets, balances } = useWallets();
  const { transactions } = useTransactions(0, 5);
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
    // Filter expense transactions for the selected period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    switch (selectedPeriod) {
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
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        break;
    }

    const expenseTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && txDate >= startDate && txDate <= endDate;
    });

    // Group by category
    const categoryTotals: { [key: string]: number } = {};
    expenseTransactions.forEach(t => {
      const cat = t.category || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
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
  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        setTotal(await totalAvailableAcrossWallets());
        setMonthTotal(await monthSpend());
        setTodayTotal(await todaySpend());
        
        // Load all categories from database
        const cats = await getCategories('expense');
        setAllCategories(cats);
        
        // Calculate income and expenses based on selected period
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;
        
        switch (selectedPeriod) {
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
          case 'custom':
            if (customStartDate && customEndDate) {
              startDate = customStartDate;
              endDate = customEndDate;
            } else {
              // Default to today if custom dates not set
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }
            break;
        }
        
        // Filter transactions by period and calculate income/expenses
        const periodTransactions = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate >= startDate && txDate <= endDate;
        });
        
        const incomeSum = periodTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const expensesSum = periodTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        
        setIncome(incomeSum);
        setExpenses(expensesSum);
      })();
    }
  }, [wallets, transactions, selectedPeriod, customStartDate, customEndDate]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
        <View>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{greeting}, {displayName} 👋</Text>
          <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Here's where your money is flowing today.</Text>
          <Text style={{ color: t.textTertiary, fontSize: 12, marginTop: 2 }}>{formatDate(new Date().toISOString())}</Text>
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
            wallets.map((w: any) => (
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

        {/* Time Period Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['today', 'week', 'month', 'custom'] as TimePeriod[]).map((period) => (
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
                flex: 1,
                backgroundColor: selectedPeriod === period ? t.primary : t.card,
                borderWidth: 1,
                borderColor: selectedPeriod === period ? t.primary : t.border,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: selectedPeriod === period ? '#FFFFFF' : t.textSecondary,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'capitalize'
              }}>
                {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Analytics Cards - Income, Expenses, Net */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Income Card */}
          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Income ({defaultCurrency})</Text>
            <Text style={{ color: t.success, fontSize: 18, fontWeight: '800' }}>{income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>

          {/* Expenses Card */}
          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Expenses ({defaultCurrency})</Text>
            <Text style={{ color: t.danger, fontSize: 18, fontWeight: '800' }}>{expenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>

          {/* Net Card */}
          <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Net ({defaultCurrency})</Text>
            <Text style={{ color: income - expenses >= 0 ? t.success : t.danger, fontSize: 18, fontWeight: '800' }}>{(income - expenses).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>
        </View>

        {/* Top Categories Section */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>Top Categories</Text>
            <Link href="/categories" asChild>
              <TouchableOpacity>
                <Text style={{ color: t.primary, fontSize: 14, fontWeight: '600' }}>Manage</Text>
              </TouchableOpacity>
            </Link>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {/* Show only categories with transactions */}
            {getCategoryBreakdown().map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={{
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  minWidth: 140,
                  ...shadows.sm
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: 4, 
                    backgroundColor: cat.color,
                    marginRight: 8
                  }} />
                  <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>{cat.category}</Text>
                </View>
                <Text style={{ color: t.danger, fontSize: 16, fontWeight: '800' }}>{formatCurrency(cat.amount, defaultCurrency)}</Text>
                <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 2 }}>{cat.percentage}% of expenses</Text>
              </TouchableOpacity>
            ))}
            
            {/* Add Category Button */}
            <Link href="/categories/create" asChild>
              <TouchableOpacity
                style={{
                  backgroundColor: t.card,
                  borderWidth: 2,
                  borderColor: t.primary,
                  borderStyle: 'dashed',
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  minWidth: 140,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: t.primary, fontSize: 24, fontWeight: '300', marginBottom: 4 }}>+</Text>
                <Text style={{ color: t.primary, fontSize: 12, fontWeight: '600' }}>Add Category</Text>
              </TouchableOpacity>
            </Link>
          </ScrollView>
        </View>

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
          {transactions.slice(0, 5).map((transaction: any) => (
            <Link key={transaction.id} href={`/transactions/${transaction.id}`} asChild>
              <TouchableOpacity style={{ backgroundColor: t.card, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: t.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{transaction.category || 'Uncategorized'}</Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{formatDate(new Date(transaction.date).toISOString())}</Text>
                  </View>
                  <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>{formatCurrency(transaction.amount, defaultCurrency)}</Text>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
        {/* Insights Preview Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          <Link href="/analytics" asChild>
            <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, minWidth: 220, ...shadows.sm }}>
              <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>Spending is lower this week</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>12% lower than last week</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/analytics" asChild>
            <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, minWidth: 220, ...shadows.sm }}>
              <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>Biggest category today</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Food & Drinks</Text>
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
            <ScrollView contentContainerStyle={{ padding: 16 }}>
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
  
  // Generate last 3 months including current month
  for (let i = 2; i >= 0; i--) {
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
