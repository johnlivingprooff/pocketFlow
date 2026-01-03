import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, useColorScheme, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getWallet, updateWallet } from '../../src/lib/db/wallets';
import { Wallet } from '../../src/types/wallet';
import { CURRENCIES } from '../../src/constants/currencies';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { error as logError } from '../../src/utils/logger';

const WALLET_TYPES: any[] = ['Cash', 'Credit Card', 'Bank Account', 'Mobile Money'];
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
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState<any>('Cash');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [exchangeRate, setExchangeRate] = useState<string>('1.0');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [isPrimary, setIsPrimary] = useState(0);
  
  // Bank Account fields
  const [accountType, setAccountType] = useState<string>('Checking');
  const [accountNumber, setAccountNumber] = useState('');
  const [showAccountTypePicker, setShowAccountTypePicker] = useState(false);
  
  // Mobile Money fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceProvider, setServiceProvider] = useState<string>('Mpesa');
  const [showServiceProviderPicker, setShowServiceProviderPicker] = useState(false);

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', buttons: [] });
  const [isSaving, setIsSaving] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const w = (await getWallet(walletId))[0];
      if (w) {
        setWallet(w);
        setName(w.name);
        setType(w.type || 'Cash');
        setCurrency(w.currency);
        setExchangeRate(String(w.exchange_rate ?? 1.0));
        setDescription(w.description || '');
        setColor(w.color);
        setIsPrimary(w.is_primary ?? 0);
        
        // Load conditional fields
        if (w.accountType) setAccountType(w.accountType);
        if (w.accountNumber) setAccountNumber(w.accountNumber);
        if (w.phoneNumber) setPhoneNumber(w.phoneNumber);
        if (w.serviceProvider) setServiceProvider(w.serviceProvider);
      }
      setLoading(false);
    } catch (err: any) {
      logError('[Wallet Edit] Failed to load wallet:', err);
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const onSave = async () => {
    if (!name.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a wallet name',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const updateData: any = {
        name: name.trim(),
        type,
        currency,
        exchange_rate: parseFloat(exchangeRate || '1.0'),
        description: description.trim(),
        color: color || null,
        is_primary: isPrimary,
      };

      // Add conditional fields based on wallet type
      if (type === 'Bank Account') {
        if (accountType.trim()) updateData.accountType = accountType.trim();
        if (accountNumber.trim()) updateData.accountNumber = accountNumber.trim();
      } else if (type === 'Mobile Money') {
        if (phoneNumber.trim()) updateData.phoneNumber = phoneNumber.trim();
        if (serviceProvider.trim()) updateData.serviceProvider = serviceProvider.trim();
      } else {
        // Clear conditional fields if not applicable
        updateData.accountType = null;
        updateData.accountNumber = null;
        updateData.phoneNumber = null;
        updateData.serviceProvider = null;
      }

      await updateWallet(walletId, updateData);
      
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'Wallet updated successfully',
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
    } catch (err: any) {
      logError('[Wallet Edit] Failed to update wallet:', err);
      
      let errorMessage = 'Failed to update wallet. Please try again.';
      if (err?.message?.includes('UNIQUE constraint')) {
        errorMessage = 'A wallet with this name already exists. Please use a different name.';
      }
      
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: errorMessage,
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: t.textSecondary }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: t.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 140 }}>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>Edit Wallet</Text>

        <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Wallet Name</Text>
        <TextInput 
          value={name} 
          onChangeText={setName} 
          placeholder="e.g. Primary Wallet"
          placeholderTextColor={t.textTertiary}
          style={{ 
            backgroundColor: t.card,
            borderWidth: 1, 
            borderColor: t.border, 
            color: t.textPrimary, 
            padding: 12, 
            borderRadius: 12, 
            marginBottom: 16,
            fontSize: 16
          }} 
        />

        <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Type</Text>
        <TouchableOpacity 
          onPress={() => setShowTypePicker(true)}
          style={{ 
            backgroundColor: t.card,
            borderWidth: 1, 
            borderColor: t.border, 
            padding: 12, 
            borderRadius: 12, 
            marginBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: 16 }}>{type}</Text>
          <Text style={{ color: t.textSecondary }}>▼</Text>
        </TouchableOpacity>

        <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Currency</Text>
        <TouchableOpacity 
          onPress={() => setShowCurrencyPicker(true)}
          style={{ 
            backgroundColor: t.card,
            borderWidth: 1, 
            borderColor: t.border, 
            padding: 12, 
            borderRadius: 12, 
            marginBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: 16 }}>{currency}</Text>
          <Text style={{ color: t.textSecondary }}>▼</Text>
        </TouchableOpacity>

        {/* Exchange Rate (only show if currency differs from default) */}
        {currency !== defaultCurrency && (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
              Exchange Rate to {defaultCurrency}
            </Text>
            <Text style={{ color: t.textTertiary, fontSize: 12, marginBottom: 6 }}>
              1 {currency} = ? {defaultCurrency}
            </Text>
            <TextInput 
              value={exchangeRate} 
              onChangeText={setExchangeRate} 
              keyboardType="decimal-pad"
              placeholder="1.0"
              placeholderTextColor={t.textTertiary}
              style={{ 
                backgroundColor: t.card,
                borderWidth: 1, 
                borderColor: t.border, 
                color: t.textPrimary, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 16,
                fontSize: 16
              }} 
            />
          </>
        )}

        {/* Bank Account Conditional Fields */}
        {type === 'Bank Account' && (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Account Type</Text>
            <TouchableOpacity 
              onPress={() => setShowAccountTypePicker(true)}
              style={{ 
                backgroundColor: t.card,
                borderWidth: 1, 
                borderColor: t.border, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                {accountType || 'Select (optional)'}
              </Text>
              <Text style={{ color: t.textSecondary }}>▼</Text>
            </TouchableOpacity>

            <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Account Number</Text>
            <TextInput 
              value={accountNumber} 
              onChangeText={setAccountNumber} 
              placeholder="e.g. 1234567890"
              placeholderTextColor={t.textTertiary}
              style={{ 
                backgroundColor: t.card,
                borderWidth: 1, 
                borderColor: t.border, 
                color: t.textPrimary, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 16,
                fontSize: 16
              }} 
            />
          </>
        )}

        {/* Mobile Money Conditional Fields */}
        {type === 'Mobile Money' && (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Service Provider</Text>
            <TouchableOpacity 
              onPress={() => setShowServiceProviderPicker(true)}
              style={{ 
                backgroundColor: t.card,
                borderWidth: 1, 
                borderColor: t.border, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                {serviceProvider || 'Select (optional)'}
              </Text>
              <Text style={{ color: t.textSecondary }}>▼</Text>
            </TouchableOpacity>

            <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Phone Number</Text>
            <TextInput 
              value={phoneNumber} 
              onChangeText={setPhoneNumber} 
              placeholder="e.g. +265999123456"
              placeholderTextColor={t.textTertiary}
              keyboardType="phone-pad"
              style={{ 
                backgroundColor: t.card,
                borderWidth: 1, 
                borderColor: t.border, 
                color: t.textPrimary, 
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 16,
                fontSize: 16
              }} 
            />
          </>
        )}

        <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Description (Optional)</Text>
        <TextInput 
          value={description} 
          onChangeText={setDescription}
          placeholder="e.g. For daily expenses"
          placeholderTextColor={t.textTertiary}
          multiline
          numberOfLines={3}
          style={{ 
            backgroundColor: t.card,
            borderWidth: 1, 
            borderColor: t.border, 
            color: t.textPrimary, 
            padding: 12, 
            borderRadius: 12, 
            marginBottom: 24,
            fontSize: 16,
            textAlignVertical: 'top'
          }} 
        />

        <TouchableOpacity 
          onPress={onSave}
          disabled={isSaving}
          style={{ 
            backgroundColor: isSaving ? t.border : t.primary, 
            padding: 16, 
            borderRadius: 12,
            ...shadows.md,
            opacity: isSaving ? 0.6 : 1
          }}
        >
          <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 16 }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: t.textPrimary }}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Text style={{ fontSize: 16, color: t.primary, fontWeight: '600' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Search currency..."
              placeholderTextColor={t.textSecondary}
              value={currencySearch}
              onChangeText={setCurrencySearch}
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 8,
                padding: 10,
                marginBottom: 12,
                color: t.textPrimary,
                fontSize: 14,
              }}
            />
            <FlatList
              data={CURRENCIES.filter(c => c.includes(currencySearch.toUpperCase()))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCurrency(item);
                    setShowCurrencyPicker(false);
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

      {/* Type Picker Modal */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 16, paddingBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: t.textPrimary, marginBottom: 16 }}>Select Wallet Type</Text>
            {WALLET_TYPES.map((walletType) => (
              <TouchableOpacity
                key={walletType}
                onPress={() => {
                  setType(walletType);
                  setShowTypePicker(false);
                }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}
              >
                <Text style={{ fontSize: 16, color: type === walletType ? t.primary : t.textPrimary }}>
                  {type === walletType ? '✓ ' : ''}{walletType}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowTypePicker(false)}
              style={{ marginTop: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: t.background }}
            >
              <Text style={{ fontSize: 16, color: t.primary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            {BANK_ACCOUNT_TYPES.map((acctType) => (
              <TouchableOpacity
                key={acctType}
                onPress={() => {
                  setAccountType(acctType);
                  setShowAccountTypePicker(false);
                }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}
              >
                <Text style={{ fontSize: 16, color: accountType === acctType ? t.primary : t.textPrimary }}>
                  {accountType === acctType ? '✓ ' : ''}{acctType}
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

      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}
