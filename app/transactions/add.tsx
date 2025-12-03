import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Platform, Modal, useColorScheme, KeyboardAvoidingView, Switch } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { addTransaction } from '../../src/lib/db/transactions';
import { yyyyMmDd } from '../../src/utils/date';
import { saveReceiptImage } from '../../src/lib/services/fileService';
import { getCategories, Category } from '../../src/lib/db/categories';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { RecurrenceFrequency } from '../../src/types/transaction';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { wallets } = useWallets();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [category, setCategory] = useState('Food');
  const [walletId, setWalletId] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [localUri, setLocalUri] = useState<string | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Recurring transaction fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [showRecurrenceEndDatePicker, setShowRecurrenceEndDatePicker] = useState(false);

  useEffect(() => {
    loadCategories();
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id!);
    }
  }, [type, wallets]);

  const loadCategories = async () => {
    const cats = await getCategories(type);
    setCategories(cats);
    if (cats.length > 0 && !category) {
      setCategory(cats[0].name);
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const manip = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      setImageBase64(manip.base64);
      setLocalUri(asset.uri);
    }
  };

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const manip = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      setImageBase64(manip.base64);
      setLocalUri(asset.uri);
    }
  };

  const generateCalendarMonths = () => {
    const months = [];
    const today = new Date();
    
    // Generate last 3 months including current month
    for (let i = 2; i >= 0; i--) {
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

  const onSave = async () => {
    let receiptUri: string | undefined = undefined;
    if (imageBase64) {
      const filename = `${yyyyMmDd(new Date())}/${amount || '0'}_receipt_${Date.now()}.jpg`;
      receiptUri = await saveReceiptImage(filename, imageBase64);
    }
    const numAmount = parseFloat(amount || '0');
    const finalAmount = type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);
    await addTransaction({ 
      wallet_id: walletId, 
      type, 
      amount: finalAmount, 
      category, 
      date: date.toISOString(), 
      notes, 
      receipt_uri: receiptUri,
      is_recurring: isRecurring,
      recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString() : undefined
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: t.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Type - Pill Toggle */}
        <Text style={{ color: t.textSecondary, marginBottom: 8 }}>Type</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
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
          <Text style={{ color: type === 'expense' ? '#fff' : t.textPrimary, fontWeight: '700' }}>Expense</Text>
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
          <Text style={{ color: type === 'income' ? '#fff' : t.textPrimary, fontWeight: '700' }}>Income</Text>
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
        <Text style={{ color: t.textPrimary }}>{yyyyMmDd(date)}</Text>
      </TouchableOpacity>

      {/* Category - Modal Picker */}
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

      {/* Wallet - Modal Picker */}
      <Text style={{ color: t.textSecondary, marginBottom: 6 }}>Wallet</Text>
      <TouchableOpacity
        onPress={() => setShowWalletPicker(true)}
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
        <Text style={{ color: t.textPrimary }}>{wallets.find(w => w.id === walletId)?.name || 'Select Wallet'}</Text>
        <Text style={{ color: t.textSecondary }}>›</Text>
      </TouchableOpacity>

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

      {/* Recurring Transaction Section */}
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
                {recurrenceEndDate ? yyyyMmDd(recurrenceEndDate) : 'No end date (recurring forever)'}
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

      {/* Receipt */}
      <Text style={{ color: t.textSecondary, marginBottom: 6 }}>Receipt (optional)</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <TouchableOpacity onPress={pickImage} style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: t.textPrimary, textAlign: 'center', fontWeight: '600' }}>Choose Image</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: t.textPrimary, textAlign: 'center', fontWeight: '600' }}>Take Photo</Text>
        </TouchableOpacity>
      </View>
      {localUri && <Image source={{ uri: localUri }} style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 12 }} />}

      {/* Save Button */}
      <TouchableOpacity onPress={onSave} style={{ backgroundColor: t.primary, padding: 14, borderRadius: 12, ...shadows.sm }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Save Transaction</Text>
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

      {/* Wallet Picker Modal */}
      <Modal visible={showWalletPicker} transparent animationType="fade" onRequestClose={() => setShowWalletPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '70%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Select Wallet</Text>
            </View>
            <ScrollView>
              {wallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  onPress={() => {
                    setWalletId(wallet.id!);
                    setShowWalletPicker(false);
                  }}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}
                >
                  <Text style={{ color: walletId === wallet.id ? t.primary : t.textPrimary, fontSize: 16, fontWeight: walletId === wallet.id ? '800' : '600' }}>{wallet.name}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{wallet.currency}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowWalletPicker(false)} style={{ padding: 16, alignItems: 'center' }}>
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
    </KeyboardAvoidingView>
  );
}
