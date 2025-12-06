import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, useColorScheme, RefreshControl } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { useTransactions } from '../../src/lib/hooks/useTransactions';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { TransactionItem } from '../../src/components/TransactionItem';
import { Link, useFocusEffect } from 'expo-router';
import { formatDate, yyyyMmDd } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { getCategories, Category } from '../../src/lib/db/categories';

export default function HistoryScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const { transactions } = useTransactions(0, 1000);
  const { wallets } = useWallets();
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload transactions
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for user feedback
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Build wallet exchange rate map
  const walletExchangeRate: Record<number, number> = Object.fromEntries(
    wallets.map(w => [w.id!, w.exchange_rate ?? 1.0])
  );

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  const handleDateSelect = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // First click or reset: set as start date
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Second click: set as end date
      if (date >= startDate) {
        setEndDate(date);
        setShowDatePicker(false);
      } else {
        // If selected date is before start, swap them
        setEndDate(startDate);
        setStartDate(date);
        setShowDatePicker(false);
      }
    }
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const generateCalendarMonths = () => {
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
  };

  // Group transactions by date
  const groupedTransactions: Record<string, typeof transactions> = {};
  const filteredTransactions = transactions.filter(tx => {
    const matchesCategory = !filterCategory || tx.category === filterCategory;
    const matchesSearch = !searchQuery || 
      (tx.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       tx.notes?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Date range filter
    const txDate = new Date(tx.date);
    const matchesDateRange = (!startDate || txDate >= startDate) && (!endDate || txDate <= endDate);
    
    return matchesCategory && matchesSearch && matchesDateRange;
  });

  filteredTransactions.forEach(tx => {
    const date = formatDate(new Date(tx.date).toISOString());
    if (!groupedTransactions[date]) {
      groupedTransactions[date] = [];
    }
    groupedTransactions[date].push(tx);
  });

  const getTransferLabel = (tx: typeof transactions[number]) => {
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
  };

  // Calculate daily totals in default currency
  const dailyTotals: Record<string, number> = {};
  Object.keys(groupedTransactions).forEach(date => {
    dailyTotals[date] = groupedTransactions[date].reduce((sum, tx) => {
      const rate = walletExchangeRate[tx.wallet_id] ?? 1.0;
      return sum + (tx.type === 'expense' && tx.category !== 'Transfer' ? Math.abs(tx.amount * rate) : 0);
    }, 0);
  });

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: t.background }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={t.primary}
          colors={[t.primary]}
        />
      }
    >
      <View style={{ padding: 16, paddingTop: 20 }}>
        {/* Header */}
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 16 }}>Transaction History</Text>

        {/* Search Bar */}
        <TextInput
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 8,
            padding: 12,
            color: t.textPrimary,
            marginBottom: 12
          }}
          placeholder="Search transactions..."
          placeholderTextColor={t.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Date Range Filter */}
        <View style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: startDate || endDate ? t.primary : t.border,
              borderRadius: 8,
              padding: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text style={{ color: startDate || endDate ? t.textPrimary : t.textSecondary, fontSize: 14 }}>
              {startDate && endDate 
                ? `${yyyyMmDd(startDate)} - ${yyyyMmDd(endDate)}`
                : startDate
                ? `From ${yyyyMmDd(startDate)}`
                : 'Select date range'}
            </Text>
            {(startDate || endDate) && (
              <TouchableOpacity onPress={clearDateFilter} style={{ padding: 4 }}>
                <Text style={{ color: t.textSecondary, fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setFilterCategory('')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: !filterCategory ? t.primary : t.card,
                borderWidth: 1,
                borderColor: !filterCategory ? t.primary : t.border
              }}
            >
              <Text style={{ color: !filterCategory ? '#FFFFFF' : t.textPrimary, fontWeight: '600' }}>All</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFilterCategory(cat.name)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    filterCategory === cat.name
                      ? t.primary
                      : cat.type === 'income'
                        ? `${t.success}20`
                        : `${t.danger}20`,
                  borderWidth: 1,
                  borderColor:
                    filterCategory === cat.name
                      ? t.primary
                      : cat.type === 'income'
                        ? `${t.success}40`
                        : `${t.danger}40`
                }}
              >
                <Text style={{
                  color: filterCategory === cat.name
                    ? '#FFFFFF'
                    : cat.type === 'income'
                      ? t.success
                      : t.danger,
                  fontWeight: '600'
                }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Grouped Transactions */}
        {Object.keys(groupedTransactions).length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
            <Text style={{ color: t.textSecondary, fontSize: 16 }}>No transactions found</Text>
          </View>
        )}

        {Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => (
          <View key={date} style={{ marginBottom: 24 }}>
            {/* Date Header with Daily Total */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: t.border
            }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{date}</Text>
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: '700' }}>
                {formatCurrency(dailyTotals[date], defaultCurrency)}
              </Text>
            </View>

            {/* Transactions for this date */}
            <View style={{ gap: 8 }}>
              {groupedTransactions[date].map(tx => {
                const isTransfer = tx.category === 'Transfer';
                return (
                <Link key={tx.id} href={`/transactions/${tx.id}`} asChild>
                  <TouchableOpacity style={{
                    backgroundColor: t.card,
                    borderWidth: 1,
                    borderColor: isTransfer ? t.border : t.border,
                    borderRadius: 12,
                    padding: 12,
                    opacity: isTransfer ? 0.6 : 1
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                          {getTransferLabel(tx)}
                        </Text>
                        {tx.notes && (
                          <Text style={{ color: isTransfer ? t.textTertiary : t.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                            {tx.notes}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                        <Text style={{
                          color: isTransfer ? t.textSecondary : tx.type === 'income' ? t.income : t.expense,
                          fontSize: 16,
                          fontWeight: '700'
                        }}>
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(
                            Math.abs(tx.amount * (walletExchangeRate[tx.wallet_id] ?? 1.0)),
                            defaultCurrency
                          )}
                        </Text>
                        {tx.receipt_uri && (
                          <Text style={{ color: t.textSecondary, fontSize: 10, marginTop: 2 }}>📎 Receipt</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Link>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Date Range Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '80%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Select Date Range</Text>
                {startDate && (
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {endDate ? `${yyyyMmDd(startDate)} - ${yyyyMmDd(endDate)}` : `From ${yyyyMmDd(startDate)}`}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {generateCalendarMonths().map((month, monthIdx) => (
                <View key={monthIdx} style={{ marginBottom: 24 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    {month.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {month.days.map((day, dayIdx) => {
                      const isStart = startDate && day.date.toDateString() === startDate.toDateString();
                      const isEnd = endDate && day.date.toDateString() === endDate.toDateString();
                      const isInRange = startDate && endDate && day.date >= startDate && day.date <= endDate;
                      const isFuture = day.date > new Date();

                      return (
                        <TouchableOpacity
                          key={dayIdx}
                          disabled={isFuture}
                          onPress={() => handleDateSelect(day.date)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isStart || isEnd ? t.primary : isInRange ? t.border : isFuture ? t.background : t.card,
                            borderWidth: 1,
                            borderColor: isStart || isEnd ? t.primary : t.border
                          }}
                        >
                          <Text style={{
                            color: isStart || isEnd ? '#FFFFFF' : isFuture ? t.textTertiary : t.textPrimary,
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
            {(startDate || endDate) && (
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.border }}>
                <TouchableOpacity
                  onPress={() => {
                    clearDateFilter();
                    setShowDatePicker(false);
                  }}
                  style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, padding: 12, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: t.textPrimary, fontWeight: '600' }}>Clear Filter</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
