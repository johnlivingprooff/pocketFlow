import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useSettings } from '../src/store/useStore';
import { theme } from '../src/theme/theme';
import { Link } from 'expo-router';
import { useWallets } from '../src/lib/hooks/useWallets';
import { WalletCard } from '../src/components/WalletCard';
import { AddButton } from '../src/components/AddButton';
import { totalAvailableAcrossWallets } from '../src/lib/db/transactions';

export default function Home() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const { wallets, balances } = useWallets();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => setTotal(await totalAvailableAcrossWallets()))();
    }
  }, [wallets]);

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
      <Text style={{ color: t.textSecondary }}>Total available</Text>
      <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 16 }}>{total.toFixed(2)} {defaultCurrency}</Text>

      <Text style={{ color: t.textSecondary, marginBottom: 8 }}>Wallets</Text>
      <View style={{ gap: 12 }}>
        {wallets.map((w) => (
          <WalletCard key={w.id} name={w.name} balance={balances[w.id!]} currency={w.currency} color={w.color} mode={themeMode} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
        <Link href="/transactions/add" asChild>
          <AddButton label="Add Expense" onPress={() => {}} mode={themeMode} />
        </Link>
        <Link href={{ pathname: '/receipt/scan' }} asChild>
          <AddButton label="Scan Receipt" onPress={() => {}} mode={themeMode} />
        </Link>
      </View>
    </ScrollView>
  );
}
