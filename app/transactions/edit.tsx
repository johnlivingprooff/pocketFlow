import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Modal, KeyboardAvoidingView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { getById, updateTransaction } from '../../src/lib/db/transactions';
import { Category } from '../../src/lib/db/categories';
import { useCategories } from '../../src/lib/hooks/useCategoriesCache';
import { Transaction } from '../../src/types/transaction';
import { formatShortDate } from '../../src/utils/date';
import { ThemedAlert } from '../../src/components/ThemedAlert';

export default function EditTransaction() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [txn, setTxn] = useState<Transaction | null>(null);

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', buttons: [] });

  const { loadCategories } = useCategories(type);

  const load = useCallback(async () => {
    if (!id || Platform.OS === 'web') return;
    try {
      const data = await getById(Number(id));
      setTxn(data);
      if (data) {
        setType(data.type);
        setAmount(String(Math.abs(data.amount)));
        setCategory(data.category ?? '');
        setDate(data.date);
        setNotes(data.notes ?? '');
      }
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to load transaction',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Load categories when type changes
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      try {
        const cats = await loadCategories();
        setCategoryOptions(cats);
        // If current category no longer matches type, clear it
        if (category && !cats.find(c => c.name === category)) {
          setCategory('');
        }
      } catch {}
    })();
  }, [type, loadCategories]);

  const handleSave = async () => {
    const value = Number(amount);
    if (isNaN(value)) {
      setAlertConfig({
        visible: true,
        title: 'Invalid amount',
        message: 'Please enter a numeric amount',
        buttons: [{ text: 'OK' }]
      });
      return;
    }
    try {
      // Use Nitro SQLite write queue pattern for transaction update
      await updateTransaction({
        id: Number(id),
        type,
        amount: type === 'expense' ? -Math.abs(value) : Math.abs(value),
        category: category || null,
        date,
        notes: notes || null,
      });
      setAlertConfig({
        visible: true,
        title: 'Saved',
        message: 'Transaction updated',
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to update transaction',
        buttons: [{ text: 'OK' }]
      });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!txn) {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textSecondary }}>Transaction not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: t.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>Edit Transaction</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: t.textSecondary, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Type Toggle */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['income', 'expense'] as const).map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => setType(opt)}
            style={{
              flex: 1,
              backgroundColor: type === opt ? t.primary : t.card,
              borderWidth: 1,
              borderColor: type === opt ? t.primary : t.border,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              ...shadows.sm,
            }}
          >
            <Text style={{ color: type === opt ? '#FFFFFF' : t.textSecondary, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' }}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Amount ({defaultCurrency})</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={t.textTertiary}
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: t.textPrimary,
            fontSize: 16,
            fontWeight: '700',
          }}
        />
      </View>

      {/* Category */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Category</Text>
        <TouchableOpacity
          onPress={() => setShowCategoryPicker(true)}
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: category ? t.textPrimary : t.textTertiary, fontSize: 16, fontWeight: '600' }}>
            {category || 'Select a category'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Date</Text>
        <TouchableOpacity
          onPress={() => {
            setTempSelectedDate(date ? new Date(date) : new Date());
            setShowDatePicker(true);
          }}
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
            {date ? formatShortDate(date) : 'Select date'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          placeholderTextColor={t.textTertiary}
          multiline
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: t.textPrimary,
            fontSize: 16,
            minHeight: 90,
          }}
        />
      </View>

      {/* Save */}
      <TouchableOpacity
        onPress={handleSave}
        style={{ backgroundColor: t.primary, padding: 16, borderRadius: 12, alignItems: 'center', ...shadows.sm }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Save Changes</Text>
      </TouchableOpacity>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPrimary }}>Select Category ({type})</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
              {categoryOptions.length === 0 && (
                <Text style={{ color: t.textSecondary, textAlign: 'center' }}>No categories found</Text>
              )}
              {categoryOptions.map((c, idx) => (
                <TouchableOpacity
                  key={`${c.id ?? idx}-${c.name}`}
                  onPress={() => {
                    setCategory(c.name);
                    setShowCategoryPicker(false);
                  }}
                  style={{
                    backgroundColor: t.card,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color || t.accent }} />
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{c.name}</Text>
                  </View>
                  {category === c.name && (
                    <Text style={{ color: t.primary, fontSize: 16 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Calendar (single date) */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPrimary }}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Selected Date Display */}
            <View style={{ padding: 16, backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Selected</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>
                {tempSelectedDate ? tempSelectedDate.toDateString() : 'None'}
              </Text>
            </View>

            {/* Calendar Grid */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
              {generateCalendarMonths().map((month, monthIdx) => (
                <View key={monthIdx} style={{ marginBottom: 24 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    {month.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {month.days.map((day, dayIdx) => {
                      const isSelected = tempSelectedDate && day.date.toDateString() === tempSelectedDate.toDateString();
                      const isPast = false; // allow any date selection
                      return (
                        <TouchableOpacity
                          key={dayIdx}
                          onPress={() => setTempSelectedDate(day.date)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isSelected ? t.primary : t.card,
                            borderWidth: 1,
                            borderColor: isSelected ? t.primary : t.border,
                          }}
                        >
                          <Text style={{
                            color: isSelected ? '#FFFFFF' : t.textPrimary,
                            fontSize: 14,
                            fontWeight: isSelected ? '800' : '600',
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

            {/* Apply Button */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.border }}>
              <TouchableOpacity
                onPress={() => {
                  if (tempSelectedDate) {
                    // keep time if present, else set to start of day
                    const d = new Date(tempSelectedDate);
                    setDate(d.toISOString());
                  }
                  setShowDatePicker(false);
                }}
                style={{
                  backgroundColor: t.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  ...shadows.sm,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Apply Date</Text>
              </TouchableOpacity>
            </View>
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
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Generate calendar months (last 6 months incl. current)
function generateCalendarMonths() {
  const months = [] as Array<{ name: string; days: { day: number; date: Date }[] }>;
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const days = [] as { day: number; date: Date }[];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, date: new Date(date.getFullYear(), date.getMonth(), day) });
    }
    months.push({ name: monthName, days });
  }
  return months;
}
