import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, updateWallet } from '../../src/lib/db/wallets';
import { Wallet } from '../../src/types/wallet';

export default function EditWallet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletId = Number(id);
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [exchangeRate, setExchangeRate] = useState<string>('1.0');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [isPrimary, setIsPrimary] = useState(0);

  const loadWallet = useCallback(async () => {
    const w = (await getWallet(walletId))[0];
    if (w) {
      setWallet(w);
      setName(w.name);
      setCurrency(w.currency);
      setExchangeRate(String(w.exchange_rate ?? 1.0));
      setColor(w.color);
      setIsPrimary(w.is_primary ?? 0);
    }
  }, [walletId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Wallet name is required');
      return;
    }
    const rate = Number(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Validation', 'Exchange rate must be a positive number');
      return;
    }

    try {
      await updateWallet(walletId, {
        name,
        currency,
        exchange_rate: rate,
        color,
        is_primary: isPrimary,
      });
      Alert.alert('Success', 'Wallet updated');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update wallet');
    }
  };

  if (!wallet) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background }}>
        <Text style={{ color: t.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 16, ...shadows.sm }}>
        <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Edit Wallet</Text>

        {/* Name */}
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Wallet name"
          placeholderTextColor={t.textTertiary}
          style={{
            backgroundColor: t.background,
            color: t.textPrimary,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        />

        {/* Currency */}
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Currency</Text>
        <TextInput
          value={currency}
          onChangeText={setCurrency}
          placeholder="Currency (e.g., USD)"
          placeholderTextColor={t.textTertiary}
          style={{
            backgroundColor: t.background,
            color: t.textPrimary,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        />

        {/* Exchange Rate */}
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Exchange Rate</Text>
        <TextInput
          value={exchangeRate}
          onChangeText={setExchangeRate}
          placeholder={`1 ${currency} = ? ${defaultCurrency}`}
          keyboardType="decimal-pad"
          placeholderTextColor={t.textTertiary}
          style={{
            backgroundColor: t.background,
            color: t.textPrimary,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        />

        {/* Color (optional) */}
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Color (optional)</Text>
        <TextInput
          value={color || ''}
          onChangeText={setColor}
          placeholder="#RRGGBB or named color"
          placeholderTextColor={t.textTertiary}
          style={{
            backgroundColor: t.background,
            color: t.textPrimary,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        />

        {/* Save Button */}
        <TouchableOpacity
          onPress={onSave}
          style={{ backgroundColor: t.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', ...shadows.sm }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
