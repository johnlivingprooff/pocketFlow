import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useSettings } from '../src/store/useStore';
import { theme } from '../src/theme/theme';
import { Link } from 'expo-router';
import { useWallets } from '../src/lib/hooks/useWallets';
import { useTransactions } from '../src/lib/hooks/useTransactions';
import { WalletCard } from '../src/components/WalletCard';
import { AddButton } from '../src/components/AddButton';
import { totalAvailableAcrossWallets, monthSpend, todaySpend } from '../src/lib/db/transactions';
import { formatDate } from '../src/utils/date';
import { formatCurrency } from '../src/utils/formatCurrency';

export default function Home() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const { wallets, balances } = useWallets();
  const { transactions } = useTransactions(0, 5);
  const [total, setTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        setTotal(await totalAvailableAcrossWallets());
        setMonthTotal(await monthSpend());
        setTodayTotal(await todaySpend());
      })();
    }
  }, [wallets, transactions]);

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
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
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      {/* Header Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <View>
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>Welcome back,</Text>
          <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 4 }}>{userName}</Text>
          <Text style={{ color: '#B8B8B8', fontSize: 12, marginTop: 2 }}>{formatDate(new Date().toISOString())}</Text>
        </View>
        <Link href="/profile" asChild>
          <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: t.background, fontSize: 18, fontWeight: '700' }}>{userName.charAt(0)}</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Financial Snapshot Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ backgroundColor: t.card, padding: 16, borderRadius: 12, width: 160, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>SPENT THIS MONTH</Text>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>{formatCurrency(monthTotal, defaultCurrency)}</Text>
          </View>
          <View style={{ backgroundColor: t.card, padding: 16, borderRadius: 12, width: 160, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>REMAINING</Text>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>{formatCurrency(total, defaultCurrency)}</Text>
          </View>
          <View style={{ backgroundColor: t.card, padding: 16, borderRadius: 12, width: 160, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>TODAY</Text>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>{formatCurrency(todayTotal, defaultCurrency)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Quick Action Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
        <Link href="/transactions/add" asChild>
          <TouchableOpacity style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: t.background, fontSize: 28, fontWeight: '300' }}>+</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/receipt/scan" asChild>
          <TouchableOpacity style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: t.textPrimary, fontSize: 24 }}>📷</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/categories/create" asChild>
          <TouchableOpacity style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: t.textPrimary, fontSize: 24 }}>📁</Text>
          </TouchableOpacity>
        </Link>
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
        {transactions.slice(0, 5).map((transaction) => (
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

      {/* Wallets Section */}
      <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Wallets</Text>
      <View style={{ gap: 12, marginBottom: 24 }}>
        {wallets.map((w) => (
          <WalletCard key={w.id} name={w.name} balance={balances[w.id!]} currency={w.currency} color={w.color} mode={themeMode} />
        ))}
      </View>
    </ScrollView>
  );
}
