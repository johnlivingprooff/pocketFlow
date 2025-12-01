import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, getWalletBalance } from '../../src/lib/db/wallets';
import { filterTransactions } from '../../src/lib/db/transactions';
import { Transaction } from '../../src/types/transaction';
import { TransactionItem } from '../../src/components/TransactionItem';
import { formatDate } from '../../src/utils/date';

export default function WalletDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletId = Number(id);
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);

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

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [loadWallet])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Wallet Header */}
      <View style={{ backgroundColor: t.card, padding: 20, borderRadius: 16, marginBottom: 20, ...shadows.md }}>
        <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 4 }}>Wallet</Text>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>{name}</Text>
        {description ? (
          <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 16 }}>{description}</Text>
        ) : null}
        
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
  );
}
