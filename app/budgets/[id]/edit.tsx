import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CalendarModal } from '@/components/CalendarModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';
import { error as logError } from '@/utils/logger';
import { getBudgetById, updateBudget } from '@/lib/db/budgets';
import { getCategories } from '@/lib/db/categories';
import { getWallets } from '@/lib/db/wallets';
import type { Budget } from '@/types/goal';
import type { Category } from '@/lib/db/categories';
import type { Wallet } from '@/types/wallet';
import * as CategoryIcons from '@/assets/icons/CategoryIcons';

type PeriodType = 'weekly' | 'monthly' | 'custom';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

const formatISODate = (date: Date) => date.toISOString().split('T')[0];

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return 'Select date';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return 'Select date';
  const parts = dateFormatter.formatToParts(parsed);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${month}-${day}, ${year}`;
};

export default function EditBudgetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const colors = theme(themeMode, systemColorScheme || 'light');

  const [budget, setBudget] = useState<Budget | null>(null);
  const [name, setName] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedWallets, setSelectedWallets] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const budgetId = typeof id === 'string' ? parseInt(id) : null;

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [budgetId])
  );

  useEffect(() => {
    if (periodType !== 'custom') {
      setDefaultEndDate();
    }
  }, [periodType, startDate]);

  const setDefaultEndDate = (baseDate?: string) => {
    const start = new Date(baseDate || startDate || new Date());
    let end = new Date(start);

    if (periodType === 'weekly') {
      end.setDate(end.getDate() + 6);
    } else if (periodType === 'monthly') {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    setEndDate(formatISODate(end));
  };

  const loadData = async () => {
    if (!budgetId) {
      Alert.alert('Error', 'Invalid budget ID');
      router.back();
      return;
    }

    try {
      setLoading(true);
      const [budgetData, cats, wals] = await Promise.all([
        getBudgetById(budgetId),
        getCategories('expense'),
        getWallets(),
      ]);

      if (!budgetData) {
        Alert.alert('Error', 'Budget not found');
        router.back();
        return;
      }

      setBudget(budgetData);
      setName(budgetData.name);
      setLimitAmount(budgetData.limitAmount.toString());
      setPeriodType(budgetData.periodType as PeriodType);
      setSelectedCategories(budgetData.categoryIds || []);
      setSelectedWallets(budgetData.linkedWalletIds || []);
      setNotes(budgetData.notes || '');
      setStartDate(budgetData.startDate);
      setEndDate(budgetData.endDate);
      setCategories(cats);
      setWallets(wals);
    } catch (err: any) {
      logError('Failed to load budget:', { error: err });
      Alert.alert('Error', 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a budget name');
      return false;
    }
    if (!limitAmount.trim() || isNaN(parseFloat(limitAmount)) || parseFloat(limitAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid budget limit');
      return false;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one category');
      return false;
    }
    if (selectedWallets.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one wallet');
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert('Validation Error', 'Start date must be before end date');
      return false;
    }
    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm() || !budgetId) return;

    try {
      setSaving(true);

      await updateBudget(budgetId, {
        name: name.trim(),
        categoryIds: selectedCategories,
        limitAmount: parseFloat(limitAmount),
        periodType,
        startDate,
        endDate,
        linkedWalletIds: selectedWallets,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Budget updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      logError('Failed to update budget:', { error: err });
      Alert.alert('Error', 'Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Budget Name */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Budget Name *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              editable={!saving}
            />
          </View>

          {/* Limit Amount */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Spending Limit ({defaultCurrency}) *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={limitAmount}
              onChangeText={setLimitAmount}
              keyboardType="decimal-pad"
              editable={!saving}
            />
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Categories *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id!);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                      } else {
                        setSelectedCategories(prev => [...prev, cat.id!]);
                      }
                    }}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    disabled={saving}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {(() => {
                        const iconKey = cat.icon || cat.name;
                        const IconComp = (CategoryIcons as any)[iconKey] || (CategoryIcons as any)[iconKey?.toLowerCase?.()] || null;
                        const isEmoji = typeof iconKey === 'string' && /\p{Extended_Pictographic}/u.test(iconKey);
                        if (isEmoji) {
                          return <Text style={{ fontSize: 16 }}>{iconKey}</Text>;
                        }
                        if (IconComp) {
                          const color = isSelected ? colors.background : colors.textPrimary;
                          return <IconComp size={18} color={color} />;
                        }
                        return null;
                      })()}
                      <Text
                        style={[
                          styles.categoryButtonText,
                          {
                            color: isSelected ? colors.background : colors.textPrimary,
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            {selectedCategories.length > 0 && (
              <Text style={[styles.selectionSummary, { color: colors.textSecondary }]}>
                {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
              </Text>
            )}
          </View>

          {/* Wallet Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Wallets *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll}>
              {/* All Wallets option */}
              <Pressable
                onPress={() => {
                  const allWalletIds = wallets.map(w => w.id!);
                  const isAllSelected = selectedWallets.length === wallets.length &&
                    allWalletIds.every(id => selectedWallets.includes(id));
                  if (isAllSelected) {
                    setSelectedWallets([]);
                  } else {
                    setSelectedWallets(allWalletIds);
                  }
                }}
                style={[
                  styles.walletButton,
                  {
                    backgroundColor: selectedWallets.length === wallets.length && wallets.length > 0 ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.walletButtonText,
                    {
                      color: selectedWallets.length === wallets.length && wallets.length > 0 ? colors.background : colors.textPrimary,
                    },
                  ]}
                >
                  All Wallets
                </Text>
              </Pressable>
              {/* Individual wallet options */}
              {wallets.map((wallet) => {
                const isSelected = selectedWallets.includes(wallet.id!);
                return (
                  <Pressable
                    key={wallet.id}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedWallets(prev => prev.filter(id => id !== wallet.id));
                      } else {
                        setSelectedWallets(prev => [...prev, wallet.id!]);
                      }
                    }}
                    style={[
                      styles.walletButton,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.walletButtonText,
                        {
                          color: isSelected ? colors.background : colors.textPrimary,
                        },
                      ]}
                    >
                      {wallet.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {selectedWallets.length > 0 && (
              <Text style={[styles.selectionSummary, { color: colors.textSecondary }]}>
                {selectedWallets.length === wallets.length ? 'All wallets selected' : `${selectedWallets.length} wallet${selectedWallets.length === 1 ? '' : 's'} selected`}
              </Text>
            )}
          </View>

          {/* Period Type */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Period Type *</Text>
            <View style={styles.periodButtonsContainer}>
              {(['weekly', 'monthly', 'custom'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setPeriodType(type)}
                  style={[
                    styles.periodButton,
                    {
                      backgroundColor:
                        periodType === type ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      {
                        color:
                          periodType === type
                            ? colors.background
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Start Date *</Text>
            <Pressable
              onPress={() => setShowStartPicker(true)}
              disabled={saving}
              style={[
                styles.dateInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  { color: startDate ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {formatDisplayDate(startDate)}
              </Text>
            </Pressable>
            {showStartPicker && (
              <CalendarModal
                visible={showStartPicker}
                onClose={() => setShowStartPicker(false)}
                onSelectDate={(date) => {
                  const iso = formatISODate(date);
                  setStartDate(iso);
                  if (periodType !== 'custom') {
                    setDefaultEndDate(iso);
                  }
                }}
                selectedDate={startDate ? new Date(startDate) : new Date()}
                minDate={new Date()}
              />
            )}
          </View>

          {/* End Date */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>End Date *</Text>
            <Pressable
              onPress={() => periodType === 'custom' && setShowEndPicker(true)}
              disabled={periodType !== 'custom' || saving}
              style={[
                styles.dateInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: periodType !== 'custom' ? 0.75 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  { color: endDate ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {formatDisplayDate(endDate)}
              </Text>
            </Pressable>
            {showEndPicker && (
              <CalendarModal
                visible={showEndPicker}
                onClose={() => setShowEndPicker(false)}
                onSelectDate={(date) => {
                  const iso = formatISODate(date);
                  setEndDate(iso);
                }}
                selectedDate={endDate ? new Date(endDate) : new Date()}
                minDate={startDate ? new Date(startDate) : new Date()}
              />
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Notes</Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!saving}
            />
          </View>

          {/* Update Button */}
          <Pressable
            onPress={handleUpdate}
            disabled={saving}
            style={[
              styles.updateButton,
              {
                backgroundColor: saving ? colors.border : colors.primary,
              },
            ]}
          >
            <Text style={[styles.updateButtonText, { color: colors.background }]}>
              {saving ? 'Updating...' : 'Update Budget'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectionSummary: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
  },
  notesInput: {
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  walletButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  walletButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  updateButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
