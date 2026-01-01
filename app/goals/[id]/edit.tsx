import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarModal } from '@/components/CalendarModal';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';
import { error as logError } from '@/utils/logger';
import { getGoalById, updateGoal } from '@/lib/db/goals';
import { getWallets } from '@/lib/db/wallets';
import type { Wallet } from '@/types/wallet';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

const formatISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export default function EditGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const colors = theme(themeMode, systemColorScheme || 'light');

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedWallets, setSelectedWallets] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const goalId = typeof id === 'string' ? parseInt(id) : null;

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [goalId])
  );

  const loadData = async () => {
    if (!goalId) {
      Alert.alert('Error', 'Invalid goal ID');
      router.back();
      return;
    }

    try {
      setLoading(true);

      // Load goal data
      const goal = await getGoalById(goalId);
      if (!goal) {
        Alert.alert('Error', 'Goal not found');
        router.back();
        return;
      }

      // Load wallets
      const walletsData = await getWallets();

      // Pre-populate form
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      setTargetDate(goal.targetDate);
      setSelectedWallets(goal.linkedWalletIds || []);
      setNotes(goal.notes || '');
      setWallets(walletsData);
    } catch (err: any) {
      logError('Failed to load goal data:', { error: err });
      Alert.alert('Error', 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return false;
    }

    if (!targetAmount.trim() || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return false;
    }

    if (!targetDate.trim()) {
      Alert.alert('Error', 'Please select a target date');
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(targetDate);
    selected.setHours(0, 0, 0, 0);

    if (selected <= today) {
      Alert.alert('Error', 'Target date must be in the future');
      return false;
    }

    if (selectedWallets.length === 0) {
      Alert.alert('Error', 'Please select at least one wallet');
      return false;
    }

    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await updateGoal(goalId!, {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        targetDate,
        linkedWalletIds: selectedWallets,
        notes: notes.trim() || undefined,
      });

      // Recalculate progress after update since wallets or target may have changed
      const { recalculateGoalProgress } = await import('@/lib/db/goals');
      await recalculateGoalProgress(goalId!);

      // Invalidate caches so goal screens will reload with fresh data
      const { invalidateTransactionCaches } = await import('@/lib/cache/queryCache');
      invalidateTransactionCaches();

      Alert.alert('Success', 'Goal updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      logError('Failed to update goal:', { error: err });
      Alert.alert('Error', err?.message || 'Failed to update goal');
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
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Goal Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Goal Name *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g., Emergency Fund"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!saving}
            />
          </View>

          {/* Target Amount */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Target Amount ({defaultCurrency}) *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g., 5000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={targetAmount}
              onChangeText={setTargetAmount}
              editable={!saving}
            />
          </View>

          {/* Target Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Target Date (YYYY-MM-DD) *</Text>
            <Pressable
              onPress={() => setShowTargetPicker(true)}
              disabled={saving}
              style={[
                styles.input,
                styles.dateInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.dateText, { color: targetDate ? colors.textPrimary : colors.textSecondary }]}> {formatDisplayDate(targetDate)} </Text>
            </Pressable>
            {showTargetPicker && (
              <CalendarModal
                visible={showTargetPicker}
                onClose={() => setShowTargetPicker(false)}
                onSelectDate={(date) => setTargetDate(formatISODate(date))}
                selectedDate={targetDate ? new Date(targetDate) : new Date()}
                minDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })()}
                title="Select target date"
              />
            )}
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              Must be a future date
            </Text>
          </View>

          {/* Wallet Selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Wallets *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.walletScroll}
            >
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
                disabled={saving}
                style={[
                  styles.walletButton,
                  {
                    backgroundColor: selectedWallets.length === wallets.length && wallets.length > 0 ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
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
              {wallets.map((w) => {
                const isSelected = selectedWallets.includes(w.id!);
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedWallets(prev => prev.filter(id => id !== w.id));
                      } else {
                        setSelectedWallets(prev => [...prev, w.id!]);
                      }
                    }}
                    disabled={saving}
                    style={[
                      styles.walletButton,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.walletButtonText,
                        {
                          color: isSelected ? colors.background : colors.textPrimary,
                        },
                      ]}
                    >
                      {w.name}
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

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Notes</Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Add any notes about this goal..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              editable={!saving}
            />
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleUpdate}
            disabled={saving}
            style={[
              styles.submitButton,
              {
                backgroundColor: saving ? colors.border : colors.primary,
              },
            ]}
          >
            <Text style={[styles.submitButtonText, { color: colors.background }]}>
              {saving ? 'Updating...' : 'Update Goal'}
            </Text>
          </Pressable>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  notesInput: {
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '400',
  },
  selectionSummary: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '400',
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
  walletScroll: {
    marginVertical: 4,
  },
  walletButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  spacer: {
    height: 40,
  },
});
