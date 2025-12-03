import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, useColorScheme, Modal, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { Transaction, RecurrenceFrequency } from '../../src/types/transaction';
import { exec } from '../../src/lib/db';
import { 
  cancelRecurringTransaction, 
  updateRecurringTransaction 
} from '../../src/lib/services/recurringTransactionService';
import { formatCurrency } from '../../src/utils/formatCurrency';

export default function RecurringTransactionsScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode, defaultCurrency } = useSettings();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  const [recurringTransactions, setRecurringTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFrequency, setEditFrequency] = useState<RecurrenceFrequency>('monthly');
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    loadRecurringTransactions();
  }, []);

  const loadRecurringTransactions = async () => {
    try {
      setLoading(true);
      const transactions = await exec<Transaction>(
        `SELECT * FROM transactions 
         WHERE is_recurring = 1 
         ORDER BY date DESC`
      );
      setRecurringTransactions(transactions);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
      Alert.alert('Error', 'Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  const calculateNextOccurrence = (transaction: Transaction): string => {
    if (!transaction.recurrence_frequency) return 'N/A';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(transaction.date);
    let nextDate = new Date(startDate);

    // Advance until we find a date in the future
    while (nextDate <= today) {
      switch (transaction.recurrence_frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }

    // Check if we've passed the end date
    if (transaction.recurrence_end_date) {
      const endDate = new Date(transaction.recurrence_end_date);
      if (nextDate > endDate) {
        return 'Ended';
      }
    }

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return nextDate.toLocaleDateString('en-US', options);
  };

  const handleCancelRecurring = (transaction: Transaction) => {
    Alert.alert(
      'Cancel Recurring Transaction',
      `Are you sure you want to stop this recurring ${transaction.type}? Future instances will not be generated, but existing transactions will remain.`,
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Stop Recurring',
          style: 'destructive',
          onPress: async () => {
            try {
              if (transaction.id) {
                await cancelRecurringTransaction(transaction.id);
                await loadRecurringTransactions();
                Alert.alert('Success', 'Recurring transaction has been cancelled');
              }
            } catch (error) {
              console.error('Error cancelling recurring transaction:', error);
              Alert.alert('Error', 'Failed to cancel recurring transaction');
            }
          },
        },
      ]
    );
  };

  const handleEditRecurring = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFrequency(transaction.recurrence_frequency || 'monthly');
    setEditEndDate(transaction.recurrence_end_date ? new Date(transaction.recurrence_end_date) : null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction?.id) return;

    try {
      await updateRecurringTransaction(
        editingTransaction.id,
        editFrequency,
        editEndDate ? editEndDate.toISOString().split('T')[0] : undefined
      );
      setShowEditModal(false);
      setEditingTransaction(null);
      await loadRecurringTransactions();
      Alert.alert('Success', 'Recurring transaction updated');
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      Alert.alert('Error', 'Failed to update recurring transaction');
    }
  };

  const frequencyOptions: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

  const renderRecurringTransaction = (transaction: Transaction) => {
    const nextOccurrence = calculateNextOccurrence(transaction);
    const isEnded = nextOccurrence === 'Ended';

    return (
      <View
        key={transaction.id}
        style={{
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          opacity: isEnded ? 0.5 : 1,
        }}
      >
        {/* Transaction Info */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
              {transaction.category}
            </Text>
            {transaction.notes && (
              <Text style={{ color: t.textSecondary, fontSize: 13, marginBottom: 4 }}>
                {transaction.notes}
              </Text>
            )}
            <Text style={{ color: t.textSecondary, fontSize: 12 }}>
              {transaction.recurrence_frequency ? transaction.recurrence_frequency.charAt(0).toUpperCase() + transaction.recurrence_frequency.slice(1) : 'N/A'}
              {transaction.recurrence_end_date && ` • Ends ${new Date(transaction.recurrence_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </Text>
          </View>
          <Text
            style={{
              color: transaction.type === 'income' ? t.success : t.danger,
              fontSize: 18,
              fontWeight: '800',
            }}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount, defaultCurrency)}
          </Text>
        </View>

        {/* Next Occurrence */}
        <View
          style={{
            backgroundColor: isEnded ? t.border : t.primary + '10',
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
            NEXT OCCURRENCE
          </Text>
          <Text style={{ color: isEnded ? t.textSecondary : t.primary, fontSize: 14, fontWeight: '700' }}>
            {nextOccurrence}
          </Text>
        </View>

        {/* Action Buttons */}
        {!isEnded && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleEditRecurring(transaction)}
              style={{
                flex: 1,
                backgroundColor: t.background,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: t.textPrimary, fontWeight: '600' }}>Edit Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCancelRecurring(transaction)}
              style={{
                flex: 1,
                backgroundColor: t.danger + '15',
                borderWidth: 1,
                borderColor: t.danger,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: t.danger, fontWeight: '600' }}>Stop Recurring</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      {/* Header */}
      <View
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: t.primary, fontSize: 28 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Recurring Transactions</Text>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <Text style={{ color: t.textSecondary, textAlign: 'center', marginTop: 32 }}>Loading...</Text>
        ) : recurringTransactions.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 64 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
              No Recurring Transactions
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>
              Set up recurring transactions for rent, salary, subscriptions, and more.
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
              ACTIVE RECURRING TRANSACTIONS
            </Text>
            {recurringTransactions.map(renderRecurringTransaction)}
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Edit Recurring Schedule</Text>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Frequency Selector */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                FREQUENCY
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {frequencyOptions.map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setEditFrequency(freq)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: editFrequency === freq ? t.primary : t.border,
                      backgroundColor: editFrequency === freq ? t.primary + '15' : t.background,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: editFrequency === freq ? t.primary : t.textSecondary,
                        fontSize: 12,
                        fontWeight: editFrequency === freq ? '700' : '600',
                      }}
                      numberOfLines={1}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* End Date */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                END DATE (OPTIONAL)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(true)}
                  style={{
                    flex: 1,
                    padding: 14,
                    backgroundColor: t.background,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: editEndDate ? t.textPrimary : t.textSecondary, fontSize: 15 }}>
                    {editEndDate ? editEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No end date'}
                  </Text>
                </TouchableOpacity>
                {editEndDate && (
                  <TouchableOpacity
                    onPress={() => setEditEndDate(null)}
                    style={{
                      padding: 14,
                      backgroundColor: t.danger + '15',
                      borderWidth: 1,
                      borderColor: t.danger,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: t.danger, fontWeight: '600' }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.border, flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingTransaction(null);
                }}
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: t.textPrimary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: t.primary,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Date Picker */}
      {showEndDatePicker && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowEndDatePicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
            <View style={{ backgroundColor: t.card, borderRadius: 12, padding: 16 }}>
              <DateTimePicker
                value={editEndDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowEndDatePicker(false);
                  }
                  if (selectedDate) {
                    setEditEndDate(selectedDate);
                  }
                }}
                minimumDate={new Date()}
                textColor={t.textPrimary}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(false)}
                  style={{
                    marginTop: 12,
                    padding: 12,
                    backgroundColor: t.primary,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
