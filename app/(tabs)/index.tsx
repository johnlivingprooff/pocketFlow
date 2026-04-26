import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, ThemeMode } from '../../src/theme/theme';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useTransactions } from '../../src/lib/hooks/useTransactions';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { formatShortDate } from '../../src/utils/date';
import { EyeIcon, EyeOffIcon } from '../../src/assets/icons/EyeOffIcon';
import { QuickAddWidget } from '../../src/components/QuickAddWidget';

function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 22) return 'Good evening';
  return 'Hello';
}

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

export default function Home() {
  const {
    themeMode,
    defaultCurrency,
    userInfo,
    hideBalances,
    setHideBalances,
    lastUsedWalletId,
    lastUsedCategory,
  } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { wallets, balances } = useWallets();
  const { transactions } = useTransactions(0, 8);

  const displayName = (userInfo?.name && userInfo.name.trim().length > 0) ? userInfo.name : 'pFlowr';
  const greeting = getGreeting();

  const totalAvailableBalance = useMemo(() => {
    return wallets.reduce((sum, wallet) => {
      const walletId = wallet.id;
      if (!walletId) return sum;
      const balance = balances[walletId] ?? 0;
      const rate = wallet.exchange_rate ?? 1.0;
      return sum + balance * rate;
    }, 0);
  }, [wallets, balances]);

  const primaryWallet = useMemo(() => {
    if (lastUsedWalletId) {
      const matched = wallets.find((wallet) => wallet.id === lastUsedWalletId);
      if (matched) return matched;
    }
    return wallets[0] || null;
  }, [wallets, lastUsedWalletId]);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
        <View style={{ marginBottom: 20, paddingTop: 20 }}>
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>{greeting}, {displayName}.</Text>
          <Text style={{ color: t.textSecondary, fontSize: 14, marginTop: 4 }}>
            Record money fast, then get out of the way.
          </Text>
        </View>

        <View style={{
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '700' }}>Ready to record</Text>
              <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 6 }} numberOfLines={1}>
                {hideBalances ? '******' : formatCurrency(totalAvailableBalance, defaultCurrency)}
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 6 }}>
                {primaryWallet ? `Default wallet: ${primaryWallet.name}` : 'Create a wallet to start logging'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setHideBalances(!hideBalances)}
              style={{ padding: 8, borderRadius: 10, backgroundColor: t.background, borderWidth: 1, borderColor: t.border }}
            >
              {hideBalances ? <EyeIcon size={18} color={t.textSecondary} /> : <EyeOffIcon size={18} color={t.textSecondary} />}
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/transactions/add', params: { type: 'expense' } })}
              style={{ flex: 1, backgroundColor: t.danger, borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: t.danger, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Add expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/transactions/add', params: { type: 'income' } })}
              style={{ flex: 1, backgroundColor: t.success, borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: t.success, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Add income</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/transactions/add', params: { type: 'transfer' } })}
              style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/transactions/history')}
              style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        <QuickAddWidget
          recentTransactions={transactions}
          defaultCurrency={defaultCurrency}
          themeMode={themeMode as Exclude<ThemeMode, never>}
        />

        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Continue where you left off</Text>
            <Link href="/wallets" asChild>
              <TouchableOpacity>
                <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>Wallets</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14 }}>
              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>LAST WALLET</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 6 }} numberOfLines={1}>
                {primaryWallet?.name || 'No wallet yet'}
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>
                {primaryWallet ? formatCurrency(balances[primaryWallet.id!] ?? 0, primaryWallet.currency || defaultCurrency) : 'Create one to begin'}
              </Text>
            </View>

            <View style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14 }}>
              <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700' }}>LAST CATEGORY</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 6 }} numberOfLines={1}>
                {lastUsedCategory || 'None yet'}
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>
                Reused automatically in quick entry
              </Text>
            </View>
          </View>
        </View>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Recent activity</Text>
            <Link href="/transactions/history" asChild>
              <TouchableOpacity>
                <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>See all</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 16 }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>No entries yet</Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                Add your first expense or income from the actions above.
              </Text>
            </View>
          ) : (
            recentTransactions.map((transaction: any) => {
              const wallet = wallets.find((item) => item.id === transaction.wallet_id);
              const currency = wallet?.currency || defaultCurrency;
              const isExpense = transaction.type === 'expense';
              const amountColor = isExpense ? t.danger : t.success;

              return (
                <Link key={transaction.id} href={`/transactions/${transaction.id}`} asChild>
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
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                          {getTransferLabel(transaction)}
                        </Text>
                        <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>
                          {formatShortDate(transaction.date)}{wallet ? ` • ${wallet.name}` : ''}
                        </Text>
                      </View>
                      <Text style={{ color: amountColor, fontSize: 15, fontWeight: '800' }}>
                        {hideBalances ? '******' : formatCurrency(Math.abs(transaction.amount), currency)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Link>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
