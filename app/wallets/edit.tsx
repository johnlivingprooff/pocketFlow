import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, useColorScheme, Alert, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, updateWallet } from '../../src/lib/db/wallets';
import { Wallet } from '../../src/types/wallet';
import { CURRENCIES } from '../../src/constants/currencies';

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
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

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
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
      <View style={{ backgroundColor: t.card, borderRadius: 20, padding: 16, width: '100%', maxWidth: 560, ...shadows.sm }}>
        <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' }}>Edit Wallet</Text>

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
        <TouchableOpacity
          onPress={() => setCurrencyPickerVisible(true)}
          style={{
            backgroundColor: t.background,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>{currency}</Text>
          <Text style={{ color: t.textTertiary, fontSize: 11 }}>Tap to change</Text>
        </TouchableOpacity>

        {/* Currency Picker Modal */}
        <Modal visible={currencyPickerVisible} transparent animationType="slide" onRequestClose={() => setCurrencyPickerVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPrimary }}>Select Currency</Text>
                <TouchableOpacity onPress={() => setCurrencyPickerVisible(false)}>
                  <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
                </TouchableOpacity>
              </View>
              <View style={{ padding: 12 }}>
                <TextInput
                  value={currencySearch}
                  onChangeText={setCurrencySearch}
                  placeholder="Search currency code"
                  placeholderTextColor={t.textTertiary}
                  style={{
                    backgroundColor: '#F7F7F7',
                    color: t.textPrimary,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
              </View>
              <FlatList
                data={CURRENCIES.filter(code => code.toLowerCase().includes(currencySearch.toLowerCase()))}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setCurrency(item);
                      setCurrencyPickerVisible(false);
                      setCurrencySearch('');
                    }}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{item}</Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12 }}>Currency code</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
        {/* Exchange Rate */}
        {currency !== defaultCurrency && (
          <View style={{ marginBottom: 12 }}>
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
              }}
            />
            <Text style={{ color: t.textTertiary, fontSize: 11, marginTop: 6 }}>
              This rate converts your wallet balance and analytics into {defaultCurrency}. For transfers, the formula used is amount × fromRate ÷ toRate.
            </Text>
          </View>
        )}
        {currency === defaultCurrency && (
          <View style={{ backgroundColor: t.background, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: t.textSecondary, fontSize: 12 }}>
              Exchange rate not required since currency matches the default ({defaultCurrency}).
            </Text>
          </View>
        )}

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
