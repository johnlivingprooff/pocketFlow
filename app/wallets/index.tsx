import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { WalletCard } from '../../src/components/WalletCard';
import { Link } from 'expo-router';

export default function WalletsList() {
  const { wallets, balances } = useWallets();
  const { themeMode } = useSettings();
  const t = theme(themeMode);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ marginBottom: 16 }}>
        <Link href="/wallets/create">Create Wallet</Link>
      </View>
      {wallets.map((w) => (
        <Link key={w.id} href={`/wallets/${w.id}`} asChild>
          <View style={{ marginBottom: 10 }}>
            <WalletCard name={w.name} balance={balances[w.id!]} currency={w.currency} color={w.color} mode={themeMode} />
          </View>
        </Link>
      ))}
    </ScrollView>
  );
}
