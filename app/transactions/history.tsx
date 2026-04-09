import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, useColorScheme, RefreshControl, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows, ThemeMode } from '../../src/theme/theme';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { Link, useLocalSearchParams } from 'expo-router';
import { formatShortDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { getCategories, Category } from '../../src/lib/db/categories';
import { filterTransactions, getIncomeExpenseForPeriod } from '../../src/lib/db/transactions';
import { invalidateTransactionCaches } from '../../src/lib/cache/queryCache';
import { exportTransactionsToCSV } from '../../src/lib/export/csvExport';
import { ExportIcon } from '../../src/assets/icons/ExportIcon';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import TimePeriodSelector, { TimePeriod } from '../../src/components/TimePeriodSelector';
import * as Sharing from 'expo-sharing';

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const { wallets } = useWallets();
  const searchParams = useLocalSearchParams();
  const { alertConfig, showErrorAlert, dismissAlert, setAlertConfig } = useAlert();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30days');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = new Date();

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

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    handlePeriodChange('30days');
  }, [handlePeriodChange]);

  useEffect(() => {
    if (searchParams.category) {
      setFilterCategory(String(searchParams.category));
      setShowFilters(true);
    }
  }, [searchParams.category]);

  useEffect(() => {
    const loadCategories = async () => {
      const cats = await getCategories();
      setCategories(cats);
    };
    void loadCategories();
  }, []);

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
        pageSize: PAGE_SIZE,
      });

      if (isLoadMore) {
        setTransactions((prev) => [...prev, ...txs]);
        setPage(nextPage);
      } else {
        setTransactions(txs);
        setPage(0);

        if (startDate && endDate) {
          const sum = await getIncomeExpenseForPeriod(startDate, endDate);
          setSummary(sum);
        } else {
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
  }, [page, startDate, endDate, filterCategory, debouncedSearchQuery]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      invalidateTransactionCaches();
      await loadData(false);
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
          title: 'Export ready',
          message: 'CSV file has been saved. Share it now?',
          buttons: [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Share',
              style: 'success',
              onPress: async () => {
                if (result.uri) await Sharing.shareAsync(result.uri);
              },
            },
          ],
        });
      } else {
        showErrorAlert('Export failed', result.error || 'Failed to export transactions');
      }
    } catch (error) {
      showErrorAlert('Error', 'Failed to export transactions');
    }
  };

  const walletExchangeRate: Record<number, number> = Object.fromEntries(
    wallets.map((wallet) => [wallet.id!, wallet.exchange_rate ?? 1.0])
  );

  const net = summary.income - summary.expense;
  const quickCategoryChips = useMemo(() => categories.slice(0, 8), [categories]);

  const sections = useMemo(() => {
    const grouped = new Map<string, typeof transactions>();
    transactions.forEach((tx) => {
      const dateLabel = formatShortDate(tx.date);
      const existing = grouped.get(dateLabel);
      if (existing) existing.push(tx);
      else grouped.set(dateLabel, [tx]);
    });
    return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
  }, [transactions]);

  const getTransferLabel = (tx: any) => {
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

  const activeFilterCount = [filterCategory, debouncedSearchQuery].filter(Boolean).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <SectionList
        style={{ flex: 1, backgroundColor: t.background }}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.primary} colors={[t.primary]} />}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>History</Text>
                <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Scan, find, and fix entries quickly.</Text>
              </View>
              <TouchableOpacity
                onPress={handleExportCSV}
                style={{ padding: 10, borderRadius: 10, backgroundColor: t.card, borderWidth: 1, borderColor: t.border }}
              >
                <ExportIcon size={20} color={t.primary} />
              </TouchableOpacity>
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

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14, ...shadows.sm }}>
                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>IN</Text>
                <Text style={{ color: t.income, fontSize: 18, fontWeight: '800', marginTop: 6 }}>{formatCurrency(summary.income, defaultCurrency)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14, ...shadows.sm }}>
                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>OUT</Text>
                <Text style={{ color: t.expense, fontSize: 18, fontWeight: '800', marginTop: 6 }}>{formatCurrency(summary.expense, defaultCurrency)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14, ...shadows.sm }}>
                <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>NET</Text>
                <Text style={{ color: net >= 0 ? t.success : t.danger, fontSize: 18, fontWeight: '800', marginTop: 6 }}>{formatCurrency(net, defaultCurrency)}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, marginBottom: 16 }}>
              <TextInput
                style={{
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  color: t.textPrimary,
                  marginBottom: showFilters ? 12 : 0,
                }}
                placeholder="Search amount, note, or category"
                placeholderTextColor={t.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>
                  {showFilters ? 'Hide quick filters' : `Show quick filters${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
                </Text>
                <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>{showFilters ? '−' : '+'}</Text>
              </TouchableOpacity>

              {showFilters && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setFilterCategory('')}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: !filterCategory ? t.primary : t.background,
                        borderWidth: 1,
                        borderColor: !filterCategory ? t.primary : t.border,
                      }}
                    >
                      <Text style={{ color: !filterCategory ? '#FFFFFF' : t.textPrimary, fontWeight: '700', fontSize: 12 }}>All</Text>
                    </TouchableOpacity>
                    {quickCategoryChips.map((cat) => {
                      const active = filterCategory === cat.name;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setFilterCategory(cat.name)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: active ? t.primary : t.background,
                            borderWidth: 1,
                            borderColor: active ? t.primary : t.border,
                          }}
                        >
                          <Text style={{ color: active ? '#FFFFFF' : t.textPrimary, fontWeight: '700', fontSize: 12 }}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ marginBottom: 10, marginTop: 4 }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>{section.title}</Text>
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
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                      {getTransferLabel(tx)}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                      {tx.notes || (isTransfer ? 'Transfer' : tx.category || 'Uncategorized')}
                    </Text>
                  </View>
                  <Text style={{ color: isTransfer ? t.textSecondary : tx.type === 'income' ? t.income : t.expense, fontSize: 15, fontWeight: '800' }}>
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(Math.abs(tx.amount * (walletExchangeRate[tx.wallet_id] ?? 1.0)), defaultCurrency)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          );
        }}
        ListEmptyComponent={
          isLoadingTransactions ? (
            <View style={{ paddingVertical: 40 }}>
              <Text style={{ color: t.textSecondary, textAlign: 'center' }}>Loading entries...</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 56 }}>
              <Text style={{ fontSize: 42, marginBottom: 12 }}>🧾</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>No matching entries</Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Try another time range or clear your filters.</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && transactions.length > 0 ? (
            <TouchableOpacity onPress={() => void loadData(true)} style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: t.primary, fontWeight: '700' }}>{isLoadingMore ? 'Loading more...' : 'Load more'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 24 }} />
          )
        }
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
