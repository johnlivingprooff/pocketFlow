import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, useColorScheme, RefreshControl, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
// Removed useTransactions hook
import { useWallets } from '../../src/lib/hooks/useWallets';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { yyyyMmDd, formatShortDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { getCategories, Category, getCategoriesHierarchy } from '../../src/lib/db/categories';
import { filterTransactions, getIncomeExpenseForPeriod } from '../../src/lib/db/transactions';
import { invalidateTransactionCaches } from '../../src/lib/cache/queryCache';
import { exportTransactionsToCSV } from '../../src/lib/export/csvExport';
import { ExportIcon } from '../../src/assets/icons/ExportIcon';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import TimePeriodSelector, { TimePeriod } from '../../src/components/TimePeriodSelector';
import * as Sharing from 'expo-sharing';

const SkeletonLoader = () => {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  return (
    <View style={{ gap: 24 }}>
      {[1, 2, 3].map((group) => (
        <View key={group} style={{ marginBottom: 24 }}>
          {/* Date Header Skeleton */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: t.border
          }}>
            <View style={{
              height: 16,
              width: 80,
              backgroundColor: t.card,
              borderRadius: 4,
              opacity: 0.5
            }} />
          </View>

          {/* Transaction Skeletons */}
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map((tx) => (
              <View key={tx} style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 12,
                padding: 12,
                opacity: 0.7
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{
                      height: 16,
                      width: 120,
                      backgroundColor: t.border,
                      borderRadius: 4,
                      marginBottom: 4,
                      opacity: 0.5
                    }} />
                    <View style={{
                      height: 12,
                      width: 80,
                      backgroundColor: t.border,
                      borderRadius: 4,
                      opacity: 0.4
                    }} />
                  </View>
                  <View style={{
                    height: 16,
                    width: 70,
                    backgroundColor: t.border,
                    borderRadius: 4,
                    opacity: 0.5
                  }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

export default function HistoryScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  // State for Infinite Scroll & Filtering
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30days');
  const PAGE_SIZE = 20;

  const { wallets } = useWallets();
  const searchParams = useLocalSearchParams();
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryHierarchy, setCategoryHierarchy] = useState<Array<{ category: Category; children: Category[] }>>([]);
  const { alertConfig, showErrorAlert, dismissAlert, setAlertConfig } = useAlert();
  const categoryScrollViewRef = useRef<ScrollView>(null);

  // Update dates when period changes
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = new Date(); // Default end is now

    switch (period) {
      case '7days':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case '30days':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      case '3months':
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        start = new Date(now);
        start.setMonth(now.getMonth() - 6);
        break;
      case 'all':
        start = null;
        end = null;
        break;
    }

    // Set start to beginning of day, end to end of day if not null
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    setStartDate(start);
    setEndDate(end);
  }, []);

  // Ensure initial period is applied
  useEffect(() => {
    handlePeriodChange('30days');
  }, [handlePeriodChange]);

  // Debounce search input to avoid querying on each keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingTransactions(true);
    }

    try {
      const nextPage = isLoadMore ? page + 1 : 0;

      const txs = await filterTransactions({
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        category: filterCategory || undefined,
        search: debouncedSearchQuery || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE
      });

      if (isLoadMore) {
        setTransactions(prev => [...prev, ...txs]);
        setPage(nextPage);
      } else {
        setTransactions(txs);
        setPage(0);

        // Also load summary when resetting (new filter/refresh)
        if (startDate && endDate) {
          const sum = await getIncomeExpenseForPeriod(startDate, endDate);
          setSummary(sum);
        } else if (selectedPeriod === 'all' || (!startDate && !endDate)) {
          // For 'all' we need a way to get total. getIncomeExpenseForPeriod handles arbitrary ranges, 
          // but we need to pass reasonable bounds or update the function.
          // As a fallback for 'all', we can pass a very wide range or make a new DB function.
          // For now, let's use a wide range if dates are null.
          const farPast = new Date(2000, 0, 1);
          const farFuture = new Date(2100, 0, 1);
          const sum = await getIncomeExpenseForPeriod(farPast, farFuture);
          setSummary(sum);
        }
      }

      setHasMore(txs.length === PAGE_SIZE);

    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
      setIsLoadingMore(false);
    }
  }, [page, startDate, endDate, filterCategory, debouncedSearchQuery, selectedPeriod]);

  // Load Initial Data & Reset when filters change
  useEffect(() => {
    loadData(false);
  }, [startDate, endDate, filterCategory, debouncedSearchQuery]);

  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;
    loadData(true);
  };

  // Sort categories to put selected one first
  const sortedCategories = useMemo(() => {
    if (!filterCategory) return categories;

    return [...categories].sort((a, b) => {
      if (a.name === filterCategory) return -1;
      if (b.name === filterCategory) return 1;
      return 0;
    });
  }, [categories, filterCategory]);

  // Scroll to start when filter changes
  useEffect(() => {
    if (categoryScrollViewRef.current) {
      categoryScrollViewRef.current.scrollTo({ x: 0, animated: true });
    }
  }, [filterCategory]);

  // Set filter category from route params
  useEffect(() => {
    if (searchParams.category) {
      setFilterCategory(String(searchParams.category));
    }
  }, [searchParams.category]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear transaction caches 
      invalidateTransactionCaches();
      // Reload logical data
      await loadData(false);
      console.log('Transaction history refreshed');
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await exportTransactionsToCSV();
      if (result.success && result.uri) {
        setAlertConfig({
          visible: true,
          title: 'Export Successful',
          message: 'CSV file has been saved. Would you like to share it?',
          buttons: [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Share',
              style: 'success',
              onPress: async () => {
                try {
                  if (result.uri) {
                    await Sharing.shareAsync(result.uri);
                  }
                } catch (shareError) {
                  console.error('Error sharing CSV:', shareError);
                  showErrorAlert('Error', 'Failed to share the CSV file');
                }
              }
            }
          ]
        });
      } else {
        showErrorAlert('Export Failed', result.error || 'Failed to export transactions');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showErrorAlert('Error', 'Failed to export transactions');
    }
  };

  // Build wallet exchange rate map
  const walletExchangeRate: Record<number, number> = Object.fromEntries(
    wallets.map(w => [w.id!, w.exchange_rate ?? 1.0])
  );

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      // Reload data when verifying screen focus (e.g. back from adding transaction)
      // Check if we already have data to avoid double fetch with useEffect
      // loadData(false); 
    }, [])
  );

  const loadCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
    const hierarchy = await getCategoriesHierarchy();
    setCategoryHierarchy(hierarchy);
    // don't turn off transaction loading here, it's handled in loadData
  };

  const getCategoryDisplayName = (tx: typeof transactions[number]) => {
    if (tx.category === 'Transfer') {
      return getTransferLabel(tx);
    }
    // Find if this is a subcategory
    const cat = categories.find(c => c.name === tx.category);
    if (cat?.parent_category_id) {
      // Return just the subcategory name
      return cat.name;
    }
    return tx.category || 'Uncategorized';
  };

  const getMainCategoryName = (tx: typeof transactions[number]) => {
    if (tx.category === 'Transfer') {
      return '';
    }
    // Find if this is a subcategory
    const cat = categories.find(c => c.name === tx.category);
    if (cat?.parent_category_id) {
      const parent = categories.find(c => c.id === cat.parent_category_id);
      return parent ? parent.name : '';
    }
    return '';
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

  const sections = useMemo(() => {
    const grouped = new Map<string, typeof transactions>();

    transactions.forEach((tx) => {
      const dateLabel = formatShortDate(tx.date);
      const existing = grouped.get(dateLabel);
      if (existing) {
        existing.push(tx);
      } else {
        grouped.set(dateLabel, [tx]);
      }
    });

    return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
  }, [transactions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      {/* Header with Export Button */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: t.background,
        borderBottomWidth: 1,
        borderBottomColor: t.border
      }}>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Transaction History</Text>
        <TouchableOpacity
          onPress={handleExportCSV}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border
          }}
          accessibilityLabel="Export transactions to CSV"
          accessibilityRole="button"
        >
          <ExportIcon size={20} color={t.primary} />
        </TouchableOpacity>
      </View>

      <SectionList
        style={{ flex: 1, backgroundColor: t.background }}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={t.primary}
            colors={[t.primary]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Time Period Selector */}
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

            {/* Dynamic Summary Cards */}
            {isLoadingTransactions && page === 0 ? (
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1, height: 80, backgroundColor: t.card, borderRadius: 12, opacity: 0.5 }} />
                <View style={{ flex: 1, height: 80, backgroundColor: t.card, borderRadius: 12, opacity: 0.5 }} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: t.card,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: t.border,
                  ...shadows.sm
                }}>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Income</Text>
                  <Text style={{ color: t.income, fontSize: 18, fontWeight: '800' }}>
                    {formatCurrency(summary.income, defaultCurrency)}
                  </Text>
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: t.card,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: t.border,
                  ...shadows.sm
                }}>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Expenses</Text>
                  <Text style={{ color: t.expense, fontSize: 18, fontWeight: '800' }}>
                    {formatCurrency(summary.expense, defaultCurrency)}
                  </Text>
                </View>
              </View>
            )}

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
                    ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
                    : startDate
                      ? `From ${formatShortDate(startDate)}`
                      : 'Custom Date Range'}
                </Text>
                {(startDate || endDate) && selectedPeriod === 'all' && (
                  <TouchableOpacity onPress={clearDateFilter} style={{ padding: 4 }}>
                    <Text style={{ color: t.textSecondary, fontSize: 18 }}>×</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <ScrollView
              ref={categoryScrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 24 }}
            >
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
                {sortedCategories.map(cat => (
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
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item: tx }) => {
          const isTransfer = tx.category === 'Transfer';
          return (
            <Link href={`/transactions/${tx.id}`} asChild>
              <TouchableOpacity
                style={{
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 12,
                  padding: 12,
                  opacity: isTransfer ? 0.8 : 1,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                      {getCategoryDisplayName(tx)}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                      {getMainCategoryName(tx) || (isTransfer ? 'Transfer' : 'Uncategorized')}
                    </Text>
                    {tx.notes && (
                      <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
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
                    {tx.receipt_path && (
                      <Text style={{ color: t.textSecondary, fontSize: 10, marginTop: 2 }}>📎 Receipt</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Link>
          );
        }}
        ListEmptyComponent={
          isLoadingTransactions && page === 0 ? (
            <SkeletonLoader />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
              <Text style={{ color: t.textSecondary, fontSize: 16 }}>No transactions found</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && transactions.length > 0 ? (
            <TouchableOpacity
              onPress={loadMore}
              style={{ padding: 16, alignItems: 'center' }}
            >
              {isLoadingMore ? (
                <Text style={{ color: t.textSecondary }}>Loading more...</Text>
              ) : (
                <Text style={{ color: t.primary, fontWeight: '600' }}>Load More</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ height: 24 }} />
          )
        }
      />

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
              <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
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

      {/* Themed Alert Component */}
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
