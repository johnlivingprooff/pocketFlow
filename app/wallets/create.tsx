import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { createWallet } from '../../src/lib/db/wallets';
import { WalletType } from '../../src/types/wallet';
import { useRouter } from 'expo-router';

export default function CreateWallet() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const router = useRouter();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [initial, setInitial] = useState('0');
  const [type, setType] = useState<WalletType>('Cash');

  const onSave = async () => {
    await createWallet({ name, currency, initial_balance: parseFloat(initial || '0'), type });
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: t.textSecondary }}>Wallet Name</Text>
      <TextInput value={name} onChangeText={setName} style={{ borderWidth: 1, borderColor: t.border, color: t.textPrimary, padding: 10, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Currency</Text>
      <TextInput value={currency} onChangeText={setCurrency} style={{ borderWidth: 1, borderColor: t.border, color: t.textPrimary, padding: 10, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Initial Balance</Text>
      <TextInput value={initial} onChangeText={setInitial} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: t.border, color: t.textPrimary, padding: 10, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Type</Text>
      <TextInput value={type} onChangeText={(v) => setType(v as WalletType)} style={{ borderWidth: 1, borderColor: t.border, color: t.textPrimary, padding: 10, borderRadius: 8, marginBottom: 12 }} />

      <TouchableOpacity onPress={onSave} style={{ backgroundColor: t.accent, padding: 12, borderRadius: 10 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
