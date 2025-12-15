import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, useColorScheme, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, updateWallet } from '../../src/lib/db/wallets';
import { Wallet } from '../../src/types/wallet';
import { CURRENCIES } from '../../src/constants/currencies';

const BANK_ACCOUNT_TYPES = ['Checking', 'Savings', 'Current', 'Other'];
const MOBILE_MONEY_PROVIDERS = ['AirtelMoney', 'Mpesa', 'Mpamba', 'Other'];

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
  
  // Bank Account fields
  const [accountType, setAccountType] = useState<string>('Checking');
  const [accountNumber, setAccountNumber] = useState('');
  const [showAccountTypePicker, setShowAccountTypePicker] = useState(false);
  
  // Mobile Money fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceProvider, setServiceProvider] = useState<string>('Mpesa');
  const [showServiceProviderPicker, setShowServiceProviderPicker] = useState(false);

  const loadWallet = useCallback(async () => {
    const w = (await getWallet(walletId))[0];
    if (w) {
      setWallet(w);
      setName(w.name);
      setCurrency(w.currency);
      setExchangeRate(String(w.exchange_rate ?? 1.0));
      setColor(w.color);
      setIsPrimary(w.is_primary ?? 0);
      
      // Load conditional fields
      if (w.accountType) setAccountType(w.accountType);
      if (w.accountNumber) setAccountNumber(w.accountNumber);
      if (w.phoneNumber) setPhoneNumber(w.phoneNumber);
      if (w.serviceProvider) setServiceProvider(w.serviceProvider);
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

    // Validate conditional fields
    if (wallet?.type === 'Bank Account' && !accountNumber.trim()) {
      Alert.alert('Validation', 'Please enter an account number');
      return;
    }

    if (wallet?.type === 'Mobile Money' && !phoneNumber.trim()) {
      Alert.alert('Validation', 'Please enter a phone number');
      return;
    }

    try {
      const updateData: any = {
        name,
        currency,
        exchange_rate: rate,
        color,
        is_primary: isPrimary,
      };

      // Add conditional fields based on wallet type
      if (wallet?.type === 'Bank Account') {
        updateData.accountType = accountType;
        updateData.accountNumber = accountNumber.trim();
      } else if (wallet?.type === 'Mobile Money') {
        updateData.phoneNumber = phoneNumber.trim();
        updateData.serviceProvider = serviceProvider;
      }

      await updateWallet(walletId, updateData);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16, paddingTop: 152, paddingBottom: 40, alignItems: 'center' }}>
      <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: 60, left: 16, zIndex: 10 }}>
        <Text style={{ color: t.primary, fontSize: 18, fontWeight: '600' }}>← Back</Text>
      </TouchableOpacity>
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

        {/* Bank Account Conditional Fields */}
        {wallet?.type === 'Bank Account' && (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Account Type</Text>
            <TouchableOpacity 
              onPress={() => setShowAccountTypePicker(true)}
              style={{ 
                backgroundColor: t.background,
                borderWidth: 1, 
                borderColor: t.border, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>{accountType}</Text>
              <Text style={{ color: t.textSecondary }}>▼</Text>
            </TouchableOpacity>

            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Account Number</Text>
            <TextInput 
              value={accountNumber} 
              onChangeText={setAccountNumber} 
              placeholder="e.g. 1234567890"
              placeholderTextColor={t.textTertiary}
              style={{ 
                backgroundColor: t.background,
                borderWidth: 1, 
                borderColor: t.border, 
                color: t.textPrimary, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 12,
                fontSize: 16
              }} 
            />
          </>
        )}

        {/* Mobile Money Conditional Fields */}
        {wallet?.type === 'Mobile Money' && (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Service Provider</Text>
            <TouchableOpacity 
              onPress={() => setShowServiceProviderPicker(true)}
              style={{ 
                backgroundColor: t.background,
                borderWidth: 1, 
                borderColor: t.border, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>{serviceProvider}</Text>
              <Text style={{ color: t.textSecondary }}>▼</Text>
            </TouchableOpacity>

            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Phone Number</Text>
            <TextInput 
              value={phoneNumber} 
              onChangeText={setPhoneNumber} 
              placeholder="e.g. +265999123456"
              placeholderTextColor={t.textTertiary}
              keyboardType="phone-pad"
              style={{ 
                backgroundColor: t.background,
                borderWidth: 1, 
                borderColor: t.border, 
                color: t.textPrimary, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 12,
                fontSize: 16
              }} 
            />
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          onPress={onSave}
          style={{ backgroundColor: t.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', ...shadows.sm }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Save Changes</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Account Type Picker Modal */}
      <Modal
        visible={showAccountTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountTypePicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 16, paddingBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: t.textPrimary, marginBottom: 16 }}>Select Account Type</Text>
            {BANK_ACCOUNT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  setAccountType(type);
                  setShowAccountTypePicker(false);
                }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}
              >
                <Text style={{ fontSize: 16, color: accountType === type ? t.primary : t.textPrimary }}>
                  {accountType === type ? '✓ ' : ''}{type}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowAccountTypePicker(false)}
              style={{ marginTop: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: t.background }}
            >
              <Text style={{ fontSize: 16, color: t.primary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Service Provider Picker Modal */}
      <Modal
        visible={showServiceProviderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceProviderPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 16, paddingBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: t.textPrimary, marginBottom: 16 }}>Select Service Provider</Text>
            {MOBILE_MONEY_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider}
                onPress={() => {
                  setServiceProvider(provider);
                  setShowServiceProviderPicker(false);
                }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}
              >
                <Text style={{ fontSize: 16, color: serviceProvider === provider ? t.primary : t.textPrimary }}>
                  {serviceProvider === provider ? '✓ ' : ''}{provider}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowServiceProviderPicker(false)}
              style={{ marginTop: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: t.background }}
            >
              <Text style={{ fontSize: 16, color: t.primary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
