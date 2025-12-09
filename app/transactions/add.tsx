import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Platform, Modal, useColorScheme, KeyboardAvoidingView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { addTransaction } from '../../src/lib/db/transactions';
import { yyyyMmDd, formatShortDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { saveReceiptImage } from '../../src/lib/services/fileService';
import { getCategories, Category } from '../../src/lib/db/categories';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { RecurrenceFrequency } from '../../src/types/transaction';
import { transferBetweenWallets } from '../../src/lib/db/transactions';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { error as logError } from '../../src/utils/logger';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { wallets, balances } = useWallets();

  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [category, setCategory] = useState('');
  const [walletId, setWalletId] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [localUri, setLocalUri] = useState<string | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Transfer-specific fields
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  
  // Recurring transaction fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [showRecurrenceEndDatePicker, setShowRecurrenceEndDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', buttons: [] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id!);
    }
  }, [type, wallets]);

  const loadCategories = async () => {
    if (type === 'transfer') return; // No categories for transfers
    const cats = await getCategories(type as 'income' | 'expense');
    setCategories(cats);
    if (cats.length > 0) {
      // If no category selected, or current category isn't valid for this type,
      // pick the first available category for the selected type
      const hasCurrent = category && cats.some(c => c.name === category);
      if (!hasCurrent) setCategory(cats[0].name);
    }
  };

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const manip = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        if (!manip.base64) {
          Alert.alert('Error', 'Failed to process image');
          return;
        }
        setImageBase64(manip.base64);
        setLocalUri(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const manip = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        if (!manip.base64) {
          Alert.alert('Error', 'Failed to process photo');
          return;
        }
        setImageBase64(manip.base64);
        setLocalUri(asset.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeImage = () => {
    setImageBase64(undefined);
    setLocalUri(undefined);
  };

  const generateCalendarMonths = () => {
    const months = [];
    const today = new Date();
    
    // Generate last 6 months including current month
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      
      const days = [];
      for (let day = 1; day <= daysInMonth; day++) {
        days.push({
          day,
          date: new Date(date.getFullYear(), date.getMonth(), day)
        });
      }
      
      months.push({ name: monthName, days });
    }
    
    return months;
  };

  const getProjectedBalance = (wallet: typeof wallets[0]) => {
    const numAmount = parseFloat(amount || '0');
    const currentBalance = balances[wallet.id!] ?? 0;
    
    // Get the source wallet to determine the transaction currency
    const sourceWallet = wallets.find(w => w.id === walletId);
    if (!sourceWallet) return currentBalance;
    
    // Only apply changes to the source wallet (walletId) or destination wallet for transfers
    if (type === 'transfer') {
      if (wallet.id === walletId) {
        // Source wallet: subtract the amount being transferred (in source currency)
        return currentBalance - numAmount;
      } else if (wallet.id === toWalletId) {
        // Destination wallet: add the amount being transferred
        // Convert amount from source wallet currency to destination wallet currency
        // Formula: amount * fromRate / toRate (same as transferBetweenWallets)
        const fromRate = sourceWallet.exchange_rate ?? 1.0;
        const toRate = wallet.exchange_rate ?? 1.0;
        const convertedAmount = numAmount * fromRate / toRate;
        return currentBalance + convertedAmount;
      }
    } else if (type === 'expense' && wallet.id === walletId) {
      // Expense: subtract from selected wallet
      return currentBalance - numAmount;
    } else if (type === 'income' && wallet.id === walletId) {
      // Income: add to selected wallet
      return currentBalance + numAmount;
    }
    
    return currentBalance;
  };

  const onSave = async () => {
    // Validation
    const numAmount = parseFloat(amount || '0');
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid amount greater than zero',
        buttons: [{ text: 'OK' }]
      });
      return;
    }
    
    if (isSaving) return; // Prevent double submission
    setIsSaving(true);
    
    try {
      // Handle transfer separately
      if (type === 'transfer') {
        if (!toWalletId) {
          setAlertConfig({
            visible: true,
            title: 'Validation Error',
            message: 'Please select a destination wallet',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
          return;
        }
        if (walletId === toWalletId) {
          setAlertConfig({
            visible: true,
            title: 'Validation Error',
            message: 'Cannot transfer to the same wallet',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
          return;
        }
        const fromBalance = balances[walletId] ?? 0;
        // Use small epsilon for floating-point comparison to avoid precision issues
        const EPSILON = 0.01; // Allow for 1 cent precision error
        if (numAmount > fromBalance + EPSILON) {
          setAlertConfig({
            visible: true,
            title: 'Insufficient Balance',
            message: 'The amount exceeds your wallet balance',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
          return;
        }
        
        try {
          await transferBetweenWallets(walletId, toWalletId, numAmount, notes.trim() || undefined);
          router.back();
        } catch (err: any) {
          logError('[Transfer] Failed to complete transfer:', err);
          setAlertConfig({
            visible: true,
            title: 'Transfer Failed',
            message: 'Failed to complete transfer. Please try again.',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
        }
        return;
      }

      // Handle regular income/expense
      let receiptUri: string | undefined = undefined;
      try {
        if (imageBase64) {
          // Use simple timestamped filename to avoid special character issues
          const filename = `receipt_${Date.now()}.jpg`;
          receiptUri = await saveReceiptImage(filename, imageBase64);
        }
      } catch (err: any) {
        logError('[Transaction] Error saving receipt:', err);
        setAlertConfig({
          visible: true,
          title: 'Receipt Save Failed',
          message: 'Failed to save receipt image. Continue without receipt?',
          buttons: [
            { text: 'Cancel', onPress: () => setIsSaving(false) },
            { 
              text: 'Continue', 
              onPress: async () => {
                await saveTransactionWithoutReceipt();
              }
            }
          ]
        });
        return;
      }
      
      const finalAmount = type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);
      
      try {
        await addTransaction({ 
          wallet_id: walletId, 
          type: type as 'income' | 'expense', 
          amount: finalAmount, 
          category, 
          date: date.toISOString(), 
          notes, 
          receipt_uri: receiptUri,
          is_recurring: isRecurring,
          recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
          recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString() : undefined
        });
        
        // Success - navigate back
        router.back();
      } catch (err: any) {
        logError('[Transaction] Failed to add transaction:', err);
        
        let errorMessage = 'Failed to add transaction. Please try again.';
        
        if (err?.message?.includes('database')) {
          errorMessage = 'Database error occurred. Please restart the app and try again.';
        } else if (err?.message?.includes('timeout')) {
          errorMessage = 'Operation timed out. Please check your connection and try again.';
        } else if (err?.message?.includes('FOREIGN KEY constraint')) {
          errorMessage = 'Invalid wallet selected. Please select a different wallet.';
        }
        
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: errorMessage,
          buttons: [{ text: 'OK' }]
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to save transaction without receipt
  const saveTransactionWithoutReceipt = async () => {
    const numAmount = parseFloat(amount || '0');
    const finalAmount = type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);
    
    try {
      await addTransaction({ 
        wallet_id: walletId, 
        type: type as 'income' | 'expense', 
        amount: finalAmount, 
        category, 
        date: date.toISOString(), 
        notes, 
        receipt_uri: undefined,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString() : undefined
      });
      
      router.back();
    } catch (err: any) {
      logError('[Transaction] Failed to add transaction without receipt:', err);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to add transaction. Please try again.',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: t.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Source Wallet - Horizontal Scroll */}
        <Text style={{ color: t.textSecondary, marginBottom: 8 }}>Select Wallet</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingRight: 16, gap: 12, marginBottom: 20 }}
          scrollEventThrottle={16}
        >
          {wallets.map((wallet) => (
            <TouchableOpacity
              key={wallet.id}
              onPress={() => setWalletId(wallet.id!)}
              style={{
                backgroundColor: walletId === wallet.id ? t.primary : t.card,
                borderWidth: 2,
                borderColor: walletId === wallet.id ? t.primary : t.border,
                borderRadius: 12,
                padding: 16,
                minWidth: 140,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: walletId === wallet.id ? '#fff' : t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                {wallet.name}
              </Text>
              <Text style={{ color: walletId === wallet.id ? '#fff' : t.textPrimary, fontSize: 16, fontWeight: '800' }}>
                {formatCurrency(getProjectedBalance(wallet), wallet.currency)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type - Pill Toggle */}
        <Text style={{ color: t.textSecondary, marginBottom: 8 }}>Type</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setType('expense')}
            style={{
              flex: 1,
              backgroundColor: type === 'expense' ? t.primary : t.card,
              borderWidth: 1,
              borderColor: type === 'expense' ? t.primary : t.border,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: type === 'expense' ? '#fff' : t.textPrimary, fontWeight: '700', fontSize: 13 }}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType('income')}
            style={{
              flex: 1,
              backgroundColor: type === 'income' ? t.primary : t.card,
              borderWidth: 1,
              borderColor: type === 'income' ? t.primary : t.border,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: type === 'income' ? '#fff' : t.textPrimary, fontWeight: '700', fontSize: 13 }}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType('transfer')}
            style={{
              flex: 1,
              backgroundColor: type === 'transfer' ? t.primary : t.card,
              borderWidth: 1,
              borderColor: type === 'transfer' ? t.primary : t.border,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: type === 'transfer' ? '#fff' : t.textPrimary, fontWeight: '700', fontSize: 13 }}>Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Text style={{ color: t.textSecondary, marginBottom: 6 }}>Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
        placeholderTextColor={t.textTertiary}
        style={{
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.card,
          color: t.textPrimary,
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      />

      {/* Date - Custom Calendar */}
      <Text style={{ color: t.textSecondary, marginBottom: 6 }}>Date</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={{
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.card,
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: t.textPrimary }}>{formatShortDate(date)}</Text>
      </TouchableOpacity>

      {/* Category - Modal Picker (only for income/expense) */}
      {type !== 'transfer' && (
        <>
          <Text style={{ color: t.textSecondary, marginBottom: 6 }}>Category</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryPicker(true)}
            style={{
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.card,
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.textPrimary }}>{category}</Text>
            <Text style={{ color: t.textSecondary }}>›</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Destination Wallet (only for transfer) - Horizontal Scroll */}
      {type === 'transfer' && (
        <>
          <Text style={{ color: t.textSecondary, marginBottom: 8 }}>Transfer To</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingRight: 16, gap: 12, marginBottom: 20 }}
            scrollEventThrottle={16}
          >
            {wallets
              .filter((wallet) => wallet.id !== walletId) // Exclude source wallet
              .map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  onPress={() => setToWalletId(wallet.id!)}
                  style={{
                    backgroundColor: toWalletId === wallet.id ? t.primary : t.card,
                    borderWidth: 2,
                    borderColor: toWalletId === wallet.id ? t.primary : t.border,
                    borderRadius: 12,
                    padding: 16,
                    minWidth: 140,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: toWalletId === wallet.id ? '#fff' : t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                    {wallet.name}
                  </Text>
                  <Text style={{ color: toWalletId === wallet.id ? '#fff' : t.textPrimary, fontSize: 16, fontWeight: '800' }}>
                    {formatCurrency(getProjectedBalance(wallet), wallet.currency)}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </>
      )}

      {/* Notes */}
      <Text style={{ color: t.textSecondary, marginBottom: 6 }}>Notes (optional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Add a note"
        placeholderTextColor={t.textTertiary}
        multiline
        numberOfLines={3}
        style={{
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.card,
          color: t.textPrimary,
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          minHeight: 80,
          textAlignVertical: 'top',
        }}
      />

      {/* Recurring Transaction Section (only for income/expense) */}
      {type !== 'transfer' && (
        <View style={{ 
          backgroundColor: t.card, 
          borderWidth: 1, 
          borderColor: t.border, 
          borderRadius: 12, 
          padding: 14, 
          marginBottom: 12 
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Recurring Transaction</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: t.border, true: t.primary }}
              thumbColor="#fff"
            />
          </View>
        
        {isRecurring && (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 12 }}>
              This transaction will repeat automatically
            </Text>

            {/* Frequency Selector */}
            <Text style={{ color: t.textSecondary, marginBottom: 6, fontSize: 13 }}>Frequency</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceFrequency[]).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  onPress={() => setRecurrenceFrequency(freq)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: recurrenceFrequency === freq ? t.primary : t.background,
                    borderWidth: 1,
                    borderColor: recurrenceFrequency === freq ? t.primary : t.border,
                  }}
                >
                  <Text style={{ 
                    color: recurrenceFrequency === freq ? '#fff' : t.textPrimary, 
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    fontSize: 13
                  }}>
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* End Date */}
            <Text style={{ color: t.textSecondary, marginBottom: 6, fontSize: 13 }}>End Date (optional)</Text>
            <TouchableOpacity
              onPress={() => setShowRecurrenceEndDatePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.background,
                padding: 12,
                borderRadius: 8,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: t.textPrimary }}>
                {recurrenceEndDate ? formatShortDate(recurrenceEndDate) : 'No end date (recurring forever)'}
              </Text>
            </TouchableOpacity>
            {recurrenceEndDate && (
              <TouchableOpacity
                onPress={() => setRecurrenceEndDate(null)}
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
              >
                <Text style={{ color: t.danger, fontSize: 12, fontWeight: '600' }}>Clear end date</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      )}

      {/* Receipt (only for income/expense) */}
      {type !== 'transfer' && (
        <>
          <Text style={{ color: t.textSecondary, marginBottom: 6 }}>Receipt (optional)</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <TouchableOpacity onPress={pickImage} style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, padding: 12, borderRadius: 8 }}>
              <Text style={{ color: t.textPrimary, textAlign: 'center', fontWeight: '600' }}>Choose Image</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePhoto} style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, padding: 12, borderRadius: 8 }}>
              <Text style={{ color: t.textPrimary, textAlign: 'center', fontWeight: '600' }}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          {localUri && (
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <Image source={{ uri: localUri }} style={{ width: '100%', height: 200, borderRadius: 8 }} />
              <TouchableOpacity
                onPress={removeImage}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Transfer Summary (only for transfer type) */}
      {type === 'transfer' && walletId && toWalletId && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (() => {
        const fromWallet = wallets.find(w => w.id === walletId);
        const toWallet = wallets.find(w => w.id === toWalletId);
        const numAmount = parseFloat(amount);
        
        if (!fromWallet || !toWallet) return null;
        
        const currenciesDiffer = fromWallet.currency !== toWallet.currency;
        let convertedAmount = numAmount;
        
        if (currenciesDiffer) {
          const fromRate = fromWallet.exchange_rate ?? 1.0;
          const toRate = toWallet.exchange_rate ?? 1.0;
          convertedAmount = numAmount * fromRate / toRate;
        }
        
        return (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Transfer Summary:</Text>
            <Text style={{ color: t.textPrimary, fontSize: 14 }}>
              {fromWallet.currency} {numAmount.toFixed(2)} from{' '}
              <Text style={{ fontWeight: '600' }}>{fromWallet.name}</Text> to{' '}
              <Text style={{ fontWeight: '600' }}>{toWallet.name}</Text>
            </Text>
            {currenciesDiffer && (
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 6 }}>
                Recipient receives: {toWallet.currency} {convertedAmount.toFixed(2)}
              </Text>
            )}
          </View>
        );
      })()}

      {/* Save Button */}
      <TouchableOpacity 
        onPress={onSave}
        disabled={isSaving}
        style={{ 
          backgroundColor: isSaving ? t.border : t.primary, 
          padding: 14, 
          borderRadius: 12, 
          ...shadows.sm,
          opacity: isSaving ? 0.6 : 1
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>
          {isSaving ? 'Saving...' : 'Save Transaction'}
        </Text>
      </TouchableOpacity>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '70%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Select Category</Text>
            </View>
            <ScrollView>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    setCategory(cat.name);
                    setShowCategoryPicker(false);
                  }}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}
                >
                  <Text style={{ color: category === cat.name ? t.primary : t.textPrimary, fontSize: 16, fontWeight: category === cat.name ? '800' : '600' }}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)} style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: t.primary, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* Custom Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '80%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {generateCalendarMonths().map((month, monthIdx) => (
                <View key={monthIdx} style={{ marginBottom: 24 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    {month.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {month.days.map((day, dayIdx) => {
                      const isSelected = date && day.date.toDateString() === date.toDateString();
                      const isPast = day.date > new Date();

                      return (
                        <TouchableOpacity
                          key={dayIdx}
                          disabled={isPast}
                          onPress={() => {
                            setDate(day.date);
                            setShowDatePicker(false);
                          }}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isSelected ? t.primary : isPast ? t.background : t.card,
                            borderWidth: 1,
                            borderColor: isSelected ? t.primary : t.border
                          }}
                        >
                          <Text style={{
                            color: isSelected ? '#FFFFFF' : isPast ? t.textTertiary : t.textPrimary,
                            fontSize: 14,
                            fontWeight: isSelected ? '800' : '600'
                          }}>
                            {day.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Recurrence End Date Picker Modal */}
      <Modal visible={showRecurrenceEndDatePicker} transparent animationType="fade" onRequestClose={() => setShowRecurrenceEndDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '80%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Recurrence End Date</Text>
              <TouchableOpacity onPress={() => setShowRecurrenceEndDatePicker(false)}>
                <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {generateCalendarMonths().map((month, monthIdx) => (
                <View key={monthIdx} style={{ marginBottom: 24 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    {month.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {month.days.map((day, dayIdx) => {
                      const isSelected = recurrenceEndDate && day.date.toDateString() === recurrenceEndDate.toDateString();
                      const isBeforeStart = day.date < date;

                      return (
                        <TouchableOpacity
                          key={dayIdx}
                          disabled={isBeforeStart}
                          onPress={() => {
                            setRecurrenceEndDate(day.date);
                            setShowRecurrenceEndDatePicker(false);
                          }}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isSelected ? t.primary : isBeforeStart ? t.background : t.card,
                            borderWidth: 1,
                            borderColor: isSelected ? t.primary : t.border
                          }}
                        >
                          <Text style={{
                            color: isSelected ? '#FFFFFF' : isBeforeStart ? t.textTertiary : t.textPrimary,
                            fontSize: 14,
                            fontWeight: isSelected ? '800' : '600'
                          }}>
                            {day.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
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
    </SafeAreaView>
  );
}
