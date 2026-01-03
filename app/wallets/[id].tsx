import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Link, router, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, getWalletBalance, deleteWallet } from '../../src/lib/db/wallets';
import { filterTransactions } from '../../src/lib/db/transactions';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { Transaction } from '../../src/types/transaction';
import { Wallet } from '../../src/types/wallet';
import { TransactionItem } from '../../src/components/TransactionItem';
import { ExportIcon } from '../../src/assets/icons/ExportIcon';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [showAddCollapsed, setShowAddCollapsed] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const { alertConfig, showConfirmAlert, showSuccessAlert, dismissAlert } = useAlert();
  const addButtonTimer = useRef<NodeJS.Timeout | null>(null);

  const loadWallet = useCallback(async () => {
    const w = (await getWallet(walletId))[0];
    if (w) {
      setWallet(w);
      setName(w.name);
      setDescription(w.description || '');
      setCurrency(w.currency);
      setBalance(await getWalletBalance(walletId));
    }

    // Load recent transactions for this wallet with lazy loading
    setIsLoadingTransactions(true);
    try {
      const txns = await filterTransactions({ walletId, page: 0, pageSize: 10 });
      setTransactions(txns);

      // Calculate income and expenses
      const incomeSum = txns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expensesSum = txns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      setIncome(incomeSum);
      setExpenses(expensesSum);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [walletId]);

  const handleDeleteWallet = () => {
    showConfirmAlert(
      'Delete wallet?',
      'Deleting a wallet removes its balance and history from this device. Consider backing up first. Continue?',
      async () => {
        try {
          await deleteWallet(walletId);
          showSuccessAlert('Wallet deleted', 'The wallet was removed.', () => router.back());
        } catch (e) {
          showConfirmAlert('Error', 'Could not delete wallet. Please try again.', () => {});
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
      loadWallet();
    }, [loadWallet])
  );

  // Auto-collapse the add button after 6 seconds once transactions exist
  useEffect(() => {
    if (transactions.length === 0) {
      setShowAddCollapsed(false);
      if (addButtonTimer.current) clearTimeout(addButtonTimer.current);
      return;
    }

    if (addButtonTimer.current) clearTimeout(addButtonTimer.current);
    addButtonTimer.current = setTimeout(() => {
      setShowAddCollapsed(true);
    }, 6000); // 6 second delay

    return () => {
      if (addButtonTimer.current) clearTimeout(addButtonTimer.current);
    };
  }, [transactions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 32 }}>
      {/* Top Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
          {/* Add Transactions button on the left — show only when wallet has activity */}
          {transactions.length > 0 && (
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
          )}
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
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Edit Wallet</Text>
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

        {/* Wallet Type and Details */}
        {wallet && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginRight: 8 }}>Type:</Text>
              <View style={{ 
                backgroundColor: t.primary + '20', 
                paddingHorizontal: 10, 
                paddingVertical: 4, 
                borderRadius: 8 
              }}>
                <Text style={{ color: t.primary, fontSize: 13, fontWeight: '700' }}>{wallet.type}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginRight: 8 }}>Currency:</Text>
              <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>{wallet.currency}</Text>
            </View>

            {/* Bank Account Details */}
            {wallet.type === 'Bank Account' && (wallet.accountType || wallet.accountNumber) && (
              <View style={{ 
                backgroundColor: t.background, 
                padding: 12, 
                borderRadius: 10, 
                marginTop: 8,
                borderLeftWidth: 3,
                borderLeftColor: t.primary
              }}>
                <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  Bank Account Details
                </Text>
                {wallet.accountType && (
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <Text style={{ color: t.textSecondary, fontSize: 13, width: 110 }}>Account Type:</Text>
                    <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>{wallet.accountType}</Text>
                  </View>
                )}
                {wallet.accountNumber && (
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ color: t.textSecondary, fontSize: 13, width: 110 }}>Account Number:</Text>
                    <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>{wallet.accountNumber}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Mobile Money Details */}
            {wallet.type === 'Mobile Money' && (wallet.serviceProvider || wallet.phoneNumber) && (
              <View style={{ 
                backgroundColor: t.background, 
                padding: 12, 
                borderRadius: 10, 
                marginTop: 8,
                borderLeftWidth: 3,
                borderLeftColor: t.primary
              }}>
                <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  Mobile Money Details
                </Text>
                {wallet.serviceProvider && (
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <Text style={{ color: t.textSecondary, fontSize: 13, width: 110 }}>Provider:</Text>
                    <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>{wallet.serviceProvider}</Text>
                  </View>
                )}
                {wallet.phoneNumber && (
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ color: t.textSecondary, fontSize: 13, width: 110 }}>Phone Number:</Text>
                    <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>{wallet.phoneNumber}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Exchange Rate Info */}
            {wallet.exchange_rate && wallet.exchange_rate !== 1.0 && wallet.currency !== defaultCurrency && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                  Exchange Rate: 1 {wallet.currency} = {wallet.exchange_rate} {defaultCurrency}
                </Text>
              </View>
            )}

            {!wallet.accountType && !wallet.accountNumber && !wallet.phoneNumber && !wallet.serviceProvider && (!wallet.exchange_rate || wallet.exchange_rate === 1.0 || wallet.currency === defaultCurrency) && (
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 6 }}>No additional details provided for this wallet.</Text>
            )}
          </View>
        )}
        
        <View style={{ borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16, marginTop: 8 }}>
          <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 4 }}>Current Balance</Text>
          <Text style={{ color: t.textPrimary, fontSize: 32, fontWeight: '800' }}>
            {balance.toLocaleString()} {currency}
          </Text>
        </View>
      </View>

      {/* Income/Expense Summary */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <View style={{ flex: 1, backgroundColor: t.card, padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: t.success, ...shadows.sm }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Income</Text>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>
            {income.toLocaleString()}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: t.card, padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: t.danger, ...shadows.sm }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Expenses</Text>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>
            {expenses.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Recent Activity</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: t.card, borderRadius: 8, borderWidth: 1, borderColor: t.border }}>
              <ExportIcon size={16} color={t.textPrimary} />
            </TouchableOpacity>
            {transactions.length > 0 && (
              <Link href="/transactions/history" asChild>
                <TouchableOpacity>
                  <Text style={{ color: t.primary, fontSize: 14, fontWeight: '600' }}>View All</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        </View>

        {isLoadingTransactions ? (
          <SkeletonLoader count={3} theme={t} />
        ) : transactions.length === 0 ? (
          <View style={{ backgroundColor: t.card, padding: 24, borderRadius: 12, alignItems: 'center', ...shadows.sm }}>
            <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>
              No transactions yet
            </Text>
            <Link href="/transactions/add" asChild>
              <TouchableOpacity style={{ marginTop: 12, backgroundColor: t.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Add Transaction</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {transactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                onPress={() => handleTransactionPress(tx.id!)}
                activeOpacity={0.7}
                style={{ backgroundColor: t.card, paddingHorizontal: 12, paddingVertical: 0, borderRadius: 8 }}
              >
                <TransactionItem 
                  item={tx} 
                  currency={currency} 
                  mode={themeMode === 'system' ? systemColorScheme || 'light' : themeMode} 
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

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
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}
