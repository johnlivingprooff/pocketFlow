import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useLocalSearchParams, Link, router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, getWalletBalance, deleteWallet } from '../../src/lib/db/wallets';
import { filterTransactions } from '../../src/lib/db/transactions';
import { Transaction } from '../../src/types/transaction';
import { TransactionItem } from '../../src/components/TransactionItem';
import { formatDate } from '../../src/utils/date';

const TrashIcon = ({ size = 18, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 7h16M10 11v6M14 11v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function WalletDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletId = Number(id);
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [showAddCollapsed, setShowAddCollapsed] = useState(false);
  const addButtonTimer = useRef<NodeJS.Timeout | null>(null);

  const loadWallet = useCallback(async () => {
    const w = (await getWallet(walletId))[0];
    if (w) {
      setName(w.name);
      setDescription(w.description || '');
      setCurrency(w.currency);
      setBalance(await getWalletBalance(walletId));
    }

    // Load recent transactions for this wallet
    const txns = await filterTransactions({ walletId, page: 0, pageSize: 10 });
    setTransactions(txns);

    // Calculate income and expenses
    const incomeSum = txns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expensesSum = txns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    setIncome(incomeSum);
    setExpenses(expensesSum);
  }, [walletId]);

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete wallet?',
      'Deleting a wallet removes its balance and history from this device. Consider backing up first. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWallet(walletId);
              Alert.alert('Wallet deleted', 'The wallet was removed.');
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Could not delete wallet. Please try again.');
            }
          },
        },
      ]
    );
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
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Top Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        {/* Add Transactions button on the left */}
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

        {/* Edit Button moved to top actions */}
        
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
          {transactions.length > 0 && (
            <Link href="/transactions/history" asChild>
              <TouchableOpacity>
                <Text style={{ color: t.primary, fontSize: 14, fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>

        {transactions.length === 0 ? (
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
              <TransactionItem 
                key={tx.id} 
                item={tx} 
                currency={currency} 
                mode={themeMode === 'system' ? systemColorScheme || 'light' : themeMode} 
              />
            ))}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}
