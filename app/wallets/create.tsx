import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { createWallet } from '../../src/lib/db/wallets';
import { WalletType } from '../../src/types/wallet';
import { useRouter } from 'expo-router';
import { CURRENCIES } from '../../src/constants/currencies';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { error as logError } from '../../src/utils/logger';

const WALLET_TYPES: WalletType[] = ['Cash', 'Credit', 'Crypto'];

export default function CreateWallet() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const router = useRouter();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [initial, setInitial] = useState('0');
  const [type, setType] = useState<WalletType>('Cash');
  const [description, setDescription] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', buttons: [] });
  const [isSaving, setIsSaving] = useState(false);

  const onSave = async () => {
    // Validation
    if (!name.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a wallet name',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    if (isSaving) return; // Prevent double submission
    setIsSaving(true);

    try {
      await createWallet({ 
        name: name.trim(), 
        currency, 
        initial_balance: parseFloat(initial || '0'), 
        type, 
        description: description.trim(),
        exchange_rate: parseFloat(exchangeRate || '1.0')
      });
      
      // Success - navigate back
      router.back();
    } catch (err: any) {
      // Log error for debugging (will appear in development and when logging is enabled)
      logError('[Wallet Creation] Failed to create wallet:', err);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to create wallet. Please try again.';
      
      // Check for specific error types
      if (err?.message?.includes('UNIQUE constraint')) {
        errorMessage = 'A wallet with this name already exists. Please use a different name.';
      } else if (err?.message?.includes('database')) {
        errorMessage = 'Database error occurred. Please restart the app and try again.';
      } else if (err?.message?.includes('timeout')) {
        errorMessage = 'Operation timed out. Please check your connection and try again.';
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

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: t.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>Create Wallet</Text>

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

      <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Initial Balance</Text>
      <TextInput 
        value={initial} 
        onChangeText={setInitial} 
        keyboardType="decimal-pad"
        placeholder="0.00"
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
          {isSaving ? 'Creating...' : 'Create Wallet'}
        </Text>
      </TouchableOpacity>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPrimary }}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Text style={{ fontSize: 24, color: t.textSecondary }}>×</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCurrency(item);
                    setShowCurrencyPicker(false);
                  }}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}
                >
                  <Text style={{ fontSize: 16, color: currency === item ? t.primary : t.textPrimary, fontWeight: currency === item ? '700' : '400' }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPrimary }}>Select Type</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <Text style={{ fontSize: 24, color: t.textSecondary }}>×</Text>
              </TouchableOpacity>
            </View>
            {WALLET_TYPES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setType(item);
                  setShowTypePicker(false);
                }}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}
              >
                <Text style={{ fontSize: 16, color: type === item ? t.primary : t.textPrimary, fontWeight: type === item ? '700' : '400' }}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      </ScrollView>
      
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </KeyboardAvoidingView>
  );
}
