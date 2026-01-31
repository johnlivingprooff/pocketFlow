import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, useColorScheme, ActivityIndicator, FlatList, ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Link, router, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, getWalletBalance, deleteWallet } from '../../src/lib/db/wallets';
import { filterTransactions, getWalletIncomeExpense } from '../../src/lib/db/transactions';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { Transaction } from '../../src/types/transaction';
import { Wallet } from '../../src/types/wallet';
import { TransactionItem } from '../../src/components/TransactionItem';
import { ExportIcon } from '../../src/assets/icons/ExportIcon';
import TimePeriodSelector, { TimePeriod } from '../../src/components/TimePeriodSelector';

const TrashIcon = ({ size = 18, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 7h16M10 11v6M14 11v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SkeletonLoader = ({ count = 3, theme }: any) => (
  <View style={{ gap: 8 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: 'row',
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          opacity: 0.6 + (i * 0.1),
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: theme.border,
            marginRight: 12,
          }}
        />
        <View style={{ flex: 1 }}>
          <View
            style={{
              height: 14,
              backgroundColor: theme.border,
              borderRadius: 6,
              marginBottom: 6,
              width: '70%',
            }}
          />
          <View
            style={{
              height: 12,
              backgroundColor: theme.border,
              borderRadius: 6,
              width: '40%',
            }}
          />
        </View>
        <View
          style={{
            width: 50,
            height: 14,
            backgroundColor: theme.border,
            borderRadius: 6,
          }}
        />
      </View>
    ))}
  </View>
);

const PAGE_SIZE = 10;

export default function WalletDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletId = Number(id);
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30days');

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { alertConfig, showConfirmAlert, showSuccessAlert, dismissAlert } = useAlert();

  const getDateRange = useCallback((period: TimePeriod) => {
    if (period === 'all') return { startDate: undefined, endDate: undefined };

    const now = new Date();
    const start = new Date();

    switch (period) {
      case '7days': start.setDate(now.getDate() - 7); break;
      case '30days': start.setDate(now.getDate() - 30); break;
      case '3months': start.setMonth(now.getMonth() - 3); break;
      case '6months': start.setMonth(now.getMonth() - 6); break;
      default: start.setDate(now.getDate() - 30);
    }

    return { startDate: start, endDate: now };
  }, []);

  const loadWalletDetails = async () => {
    const w = (await getWallet(walletId))[0];
    if (w) {
      setWallet(w);
      setName(w.name);
      setDescription(w.description || '');
      setCurrency(w.currency);
      setBalance(await getWalletBalance(walletId));
    }
  };

  const loadSummary = async () => {
    const { startDate, endDate } = getDateRange(selectedPeriod);
    const totals = await getWalletIncomeExpense(walletId, startDate, endDate);
    setIncome(totals.income);
    setExpenses(totals.expense);
  };

  const loadTransactions = async (pageNum: number, shouldAppend: boolean = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { startDate, endDate } = getDateRange(selectedPeriod);
      const txns = await filterTransactions({
        walletId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        page: pageNum,
        pageSize: PAGE_SIZE
      });

      if (shouldAppend) {
        setTransactions(prev => [...prev, ...txns]);
      } else {
        setTransactions(txns);
      }

      setHasMore(txns.length === PAGE_SIZE);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial Load & Period Change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setTransactions([]);
    loadWalletDetails();
    loadSummary();
    loadTransactions(0, false);
  }, [walletId, selectedPeriod]);

  // Handle Load More
  const handleLoadMore = () => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadTransactions(nextPage, true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(0);
    loadWalletDetails();
    loadSummary();
    await loadTransactions(0, false);
  };

  const handleDeleteWallet = () => {
    showConfirmAlert(
      'Delete wallet?',
      'Deleting a wallet removes its balance and history from this device. Consider backing up first. Continue?',
      async () => {
        try {
          await deleteWallet(walletId);
          showSuccessAlert('Wallet deleted', 'The wallet was removed.', () => router.back());
        } catch (e) {
          showConfirmAlert('Error', 'Could not delete wallet. Please try again.', () => { });
        }
      }
    );
  };

  const handleTransactionPress = (txId: number) => {
    router.push({
      pathname: '/transactions/[id]',
      params: { id: String(txId) },
    });
  };

  useFocusEffect(
    useCallback(() => {
      // Refresh balance and summary on focus, but maintain list position ideally
      // For simplicity, we just reload the summary and wallet details
      loadWalletDetails();
      loadSummary();
      // If list is empty (first load), trigger load
      if (transactions.length === 0) {
        loadTransactions(0, false);
      }
    }, [])
  );

  const renderHeader = () => (
    <View style={{ marginBottom: 16 }}>
      {/* Top Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        {/* Add Transactions button */}
        <Link href={{ pathname: '/transactions/add', params: { walletId: String(walletId) } }} asChild>
          <TouchableOpacity
            style={{
              backgroundColor: t.primary,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              ...shadows.sm,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>＋</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Transact</Text>
          </TouchableOpacity>
        </Link>

        {/* Right side actions */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleDeleteWallet}
            style={{
              backgroundColor: t.card,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: t.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              ...shadows.sm,
            }}
          >
            <TrashIcon size={16} color={t.textPrimary} />
            <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>Delete</Text>
          </TouchableOpacity>

          <Link href={{ pathname: '/wallets/edit', params: { id: String(walletId) } }} asChild>
            <TouchableOpacity style={{ backgroundColor: t.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, ...shadows.sm }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Edit</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Wallet Header */}
      <View style={{ backgroundColor: t.card, padding: 20, borderRadius: 16, marginBottom: 20, ...shadows.md }}>
        <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 4 }}>Wallet</Text>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>{name}</Text>
        {description ? (
          <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 16 }}>{description}</Text>
        ) : null}

        {wallet && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginRight: 8 }}>Type:</Text>
              <View style={{ backgroundColor: t.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: t.primary, fontSize: 13, fontWeight: '700' }}>{wallet.type}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginRight: 8 }}>Currency:</Text>
              <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>{wallet.currency}</Text>
            </View>
            {/* Additional details omitted for brevity but can be restored if needed */}
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16, marginTop: 8 }}>
          <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 4 }}>Current Balance</Text>
          <Text style={{ color: t.textPrimary, fontSize: 32, fontWeight: '800' }}>
            {balance.toLocaleString()} {currency}
          </Text>
        </View>
      </View>

      {/* Time Period Filter */}
      <View style={{ marginBottom: 8 }}>
        <TimePeriodSelector
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          textColor={t.textSecondary}
          backgroundColor={t.card}
          primaryColor={t.primary}
          borderColor={t.border}
        />
      </View>

      {/* Income/Expense/Transfer Summary */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <View style={{ flex: 1, backgroundColor: t.card, padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: t.success, ...shadows.sm }}>
          <Text style={{ color: t.textSecondary, fontSize: 11, marginBottom: 4 }}>Income</Text>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
            {income.toLocaleString()}
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: t.card, padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: t.danger, ...shadows.sm }}>
          <Text style={{ color: t.textSecondary, fontSize: 11, marginBottom: 4 }}>Expenses</Text>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
            {expenses.toLocaleString()}
          </Text>
        </View>

        <Link href={{ pathname: '/transactions/add', params: { walletId: String(walletId), type: 'transfer' } }} asChild>
          <TouchableOpacity style={{ flex: 1, backgroundColor: t.card, padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: t.primary, ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 11, marginBottom: 4 }}>Transfer</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800' }}>⇄</Text>
              <Text style={{ color: t.primary, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Send</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Header for List */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Transactions</Text>
      </View>
    </View>
  );

  const renderItem: ListRenderItem<Transaction> = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleTransactionPress(item.id!)}
      activeOpacity={0.7}
      style={{ backgroundColor: t.card, paddingHorizontal: 12, paddingVertical: 0, borderRadius: 8, marginBottom: 8 }}
    >
      <TransactionItem
        item={item}
        currency={currency}
        mode={(themeMode === 'system' ? systemColorScheme || 'light' : (themeMode === 'dark-teal' ? 'dark' : themeMode)) as 'light' | 'dark'}
      />
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isLoading) return <View style={{ height: 40 }} />;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={t.primary} />
      </View>
    );
  };

  const renderEmpty = () => (
    !isLoading ? (
      <View style={{ backgroundColor: t.card, padding: 24, borderRadius: 12, alignItems: 'center', ...shadows.sm, marginTop: 10 }}>
        <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>
          No transactions found for this period
        </Text>
      </View>
    ) : null
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={(effectiveMode === 'dark-teal' ? 'dark' : effectiveMode) as 'light' | 'dark'}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}
