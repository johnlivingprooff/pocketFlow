import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { getWallet, getWalletBalance } from '../../src/lib/db/wallets';

export default function WalletDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletId = Number(id);
  const { themeMode } = useSettings();
  const t = theme(themeMode);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    (async () => {
      const w = (await getWallet(walletId))[0];
      if (w) {
        setName(w.name);
        setCurrency(w.currency);
        setBalance(await getWalletBalance(walletId));
      }
    })();
  }, [walletId]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>{name}</Text>
      <Text style={{ color: t.textSecondary, marginTop: 8 }}>Balance</Text>
      <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>{balance.toFixed(2)} {currency}</Text>
    </ScrollView>
  );
}
