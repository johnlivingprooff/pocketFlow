import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Modal, Switch, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { Transaction, RecurrenceFrequency, TransactionType } from '../../src/types/transaction';
import { getDbAsync } from '../../src/lib/db';
import { 
  cancelRecurringTransaction, 
  updateRecurringTransaction 
} from '../../src/lib/services/recurringTransactionService';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { getWallets } from '../../src/lib/db/wallets';
import { getCategoriesHierarchy } from '../../src/lib/db/categories';
import { enqueueWrite } from '../../src/lib/db/writeQueue';
import { CalendarModal } from '../../src/components/CalendarModal';
import { SelectModal, SelectOption } from '../../src/components/SelectModal';
import { CATEGORY_ICONS } from '../../src/assets/icons/CategoryIcons';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';

export default function RecurringTransactionsScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode, defaultCurrency } = useSettings();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { alertConfig, showErrorAlert, showConfirmAlert, showSuccessAlert, dismissAlert, setAlertConfig } = useAlert();

  const [recurringTransactions, setRecurringTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFrequency, setEditFrequency] = useState<RecurrenceFrequency>('monthly');
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Create new recurring transaction states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<TransactionType>('expense');
  const [createWalletId, setCreateWalletId] = useState<number>(0);
  const [createAmount, setCreateAmount] = useState('');
  const [createCategory, setCreateCategory] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createDate, setCreateDate] = useState(new Date());
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);
  const [createFrequency, setCreateFrequency] = useState<RecurrenceFrequency>('monthly');
  const [categoryHierarchy, setCategoryHierarchy] = useState<Array<{ category: any; children: any[] }>>([]);
  const [createEndDate, setCreateEndDate] = useState<Date | null>(null);
  const [showCreateEndDatePicker, setShowCreateEndDatePicker] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [createToWalletId, setCreateToWalletId] = useState<number>(0);

  // Modal visibility states
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showToWalletModal, setShowToWalletModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    loadRecurringTransactions();
    loadWalletsAndCategories();
  }, []);

  // Load categories when transaction type changes
  useEffect(() => {
    loadWalletsAndCategories();
  }, [createType]);

  const loadWalletsAndCategories = async () => {
    try {
      setLoadingCategories(true);
      const w = await getWallets();
      setWallets(w);
      if (w.length > 0 && !createWalletId) {
        setCreateWalletId(w[0].id!);
      }

      // Load categories based on current transaction type
      if (createType !== 'transfer') {
        try {
          const hierarchy = await getCategoriesHierarchy(createType);
          setCategoryHierarchy(hierarchy);
          
          // Flatten for backwards compatibility
          const flatCats: any[] = [];
          hierarchy.forEach(h => {
            flatCats.push(h.category);
            flatCats.push(...h.children);
          });
          setCategories(flatCats);
          
          // Set first category as default
          if (flatCats.length > 0) {
            setCreateCategory(flatCats[0].id?.toString() ?? '');
          } else {
            setCreateCategory('');
          }
        } catch (error) {
          console.error('Error loading category hierarchy:', error);
          setCategories([]);
          setCategoryHierarchy([]);
          setCreateCategory('');
        }
      } else {
        // For transfers, no category needed
        setCategories([]);
        setCategoryHierarchy([]);
        setCreateCategory('transfer');
      }
    } catch (error) {
      console.error('Error loading wallets and categories:', error);
      showErrorAlert('Error', 'Failed to load wallets. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadRecurringTransactions = async () => {
    try {
      setLoading(true);
      const database = await getDbAsync();
      const result = await database.execute(
        `SELECT t.*, w.currency as walletCurrency FROM transactions t
         LEFT JOIN wallets w ON t.wallet_id = w.id
         WHERE t.is_recurring = 1 
         ORDER BY t.date DESC`
      );
      const transactions = result.rows?._array as unknown as (Transaction & { walletCurrency: string })[];
      setRecurringTransactions(transactions);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
      showErrorAlert('Error', 'Failed to load recurring transactions');
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
    setAlertConfig({
      visible: true,
      title: 'Cancel Recurring Transaction',
      message: `Are you sure you want to stop this recurring ${transaction.type}? Future instances will not be generated, but existing transactions will remain.`,
      buttons: [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Stop Recurring',
          style: 'destructive',
          onPress: async () => {
            try {
              if (transaction.id) {
                await cancelRecurringTransaction(transaction.id);
                await loadRecurringTransactions();
                showSuccessAlert('Success', 'Recurring transaction has been cancelled');
              }
            } catch (error) {
              console.error('Error cancelling recurring transaction:', error);
              showErrorAlert('Error', 'Failed to cancel recurring transaction');
            }
          },
        },
      ],
    });
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
      showSuccessAlert('Success', 'Recurring transaction updated');
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      showErrorAlert('Error', 'Failed to update recurring transaction');
    }
  };

  const handleCreateRecurring = async () => {
    // Validation
    const amount = parseFloat(createAmount);
    if (!createWalletId || !amount || !createCategory) {
      showErrorAlert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (createType === 'transfer' && !createToWalletId) {
      showErrorAlert('Validation Error', 'Please select a destination wallet for the transfer');
      return;
    }

    try {
      await enqueueWrite(async () => {
        const database = await getDbAsync();
        
        if (createType === 'transfer') {
          // Create paired transfer transactions
          const now = createDate.toISOString();
          const transferNotes = createNotes ? `Transfer: ${createNotes}` : 'Transfer between wallets';
          
          const fromWallet = wallets.find(w => w.id === createWalletId);
          const toWallet = wallets.find(w => w.id === createToWalletId);
          
          let receivedAmount = amount;
          if (fromWallet && toWallet && fromWallet.currency !== toWallet.currency) {
            const fromRate = fromWallet.exchange_rate ?? 1.0;
            const toRate = toWallet.exchange_rate ?? 1.0;
            receivedAmount = amount * fromRate / toRate;
          }

          // Create both transactions in a single batch
          await database.transaction(async (tx) => {
            // Outgoing transfer
            await tx.executeAsync(
              `INSERT INTO transactions
               (wallet_id, type, amount, category, date, notes, is_recurring, recurrence_frequency, recurrence_end_date, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                createWalletId,
                'expense',
                -Math.abs(amount),
                'Transfer',
                createDate.toISOString(),
                `${transferNotes} to ${toWallet?.name}`,
                1,
                createFrequency,
                createEndDate ? createEndDate.toISOString().split('T')[0] : null,
                new Date().toISOString(),
              ]
            );

            // Incoming transfer
            await tx.executeAsync(
              `INSERT INTO transactions
               (wallet_id, type, amount, category, date, notes, is_recurring, recurrence_frequency, recurrence_end_date, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                createToWalletId,
                'income',
                Math.abs(receivedAmount),
                'Transfer',
                createDate.toISOString(),
                `${transferNotes} from ${fromWallet?.name}`,
                1,
                createFrequency,
                createEndDate ? createEndDate.toISOString().split('T')[0] : null,
                new Date().toISOString(),
              ]
            );
          });
        } else {
          // Create single income/expense transaction
          // Resolve category ID to name
          const selectedCat = categories.find(c => c.id?.toString() === createCategory);
          const categoryName = selectedCat?.name || 'Uncategorized';

          await database.transaction(async (tx) => {
            await tx.executeAsync(
              `INSERT INTO transactions
               (wallet_id, type, amount, category, date, notes, is_recurring, recurrence_frequency, recurrence_end_date, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                createWalletId,
                createType,
                createType === 'income' ? Math.abs(amount) : -Math.abs(amount),
                categoryName,
                createDate.toISOString(),
                createNotes || null,
                1,
                createFrequency,
                createEndDate ? createEndDate.toISOString().split('T')[0] : null,
                new Date().toISOString(),
              ]
            );
          });
        }
      }, 'create_recurring_transaction');

      // Reset form and reload
      setShowCreateModal(false);
      setCreateType('expense');
      setCreateAmount('');
      setCreateNotes('');
      setCreateDate(new Date());
      setCreateFrequency('monthly');
      setCreateEndDate(null);
      setCreateCategory('');
      setCreateWalletId(wallets.length > 0 ? wallets[0].id! : 0);
      setCreateToWalletId(0);
      await loadRecurringTransactions();
      showSuccessAlert('Success', 'Recurring transaction created successfully');
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      showErrorAlert('Error', 'Failed to create recurring transaction');
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
            {formatCurrency(transaction.amount, (transaction as any).walletCurrency || defaultCurrency)}
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
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 16,
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}>
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

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => setShowCreateModal(true)}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.primary,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 28 }}>+</Text>
      </TouchableOpacity>

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
      <CalendarModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onSelectDate={(date) => setEditEndDate(date)}
        selectedDate={editEndDate || new Date()}
        minDate={editingTransaction?.date ? new Date(editingTransaction.date) : new Date()}
        title="End Date"
      />

      {/* Create Recurring Transaction Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Create Recurring Transaction</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Transaction Type */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                TYPE
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {(['expense', 'income', 'transfer'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setCreateType(type as any)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: createType === type ? t.primary : t.border,
                      backgroundColor: createType === type ? t.primary + '15' : t.background,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: createType === type ? t.primary : t.textSecondary,
                        fontSize: 12,
                        fontWeight: createType === type ? '700' : '600',
                      }}
                      numberOfLines={1}
                    >
                      {type === 'expense' ? '💸 Expense' : type === 'income' ? '💰 Income' : '⇄ Transfer'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Source Wallet */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                {createType === 'transfer' ? 'FROM WALLET' : 'WALLET'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowWalletModal(true)}
                style={{
                  padding: 14,
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 8,
                  marginBottom: 20,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '600' }}>
                    {wallets.find(w => w.id === createWalletId)?.name || 'Select wallet'}
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {wallets.find(w => w.id === createWalletId)?.currency}
                  </Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 16 }}>›</Text>
              </TouchableOpacity>

              {/* Destination Wallet (Transfer only) */}
              {createType === 'transfer' && (
                <>
                  <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                    TO WALLET
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowToWalletModal(true)}
                    style={{
                      padding: 14,
                      backgroundColor: t.background,
                      borderWidth: 1,
                      borderColor: t.border,
                      borderRadius: 8,
                      marginBottom: 20,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '600' }}>
                        {wallets.find(w => w.id === createToWalletId)?.name || 'Select wallet'}
                      </Text>
                      <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {wallets.find(w => w.id === createToWalletId)?.currency}
                      </Text>
                    </View>
                    <Text style={{ color: t.textSecondary, fontSize: 16 }}>›</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Amount */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                AMOUNT
              </Text>
              <TextInput
                value={createAmount}
                onChangeText={setCreateAmount}
                placeholder="0.00"
                placeholderTextColor={t.textSecondary}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 8,
                  padding: 12,
                  color: t.textPrimary,
                  marginBottom: 20,
                  fontSize: 16,
                }}
              />

              {/* Category */}
              {createType !== 'transfer' && (
                <>
                  <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                    CATEGORY
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCategoryModal(true)}
                    disabled={loadingCategories || categories.length === 0}
                    style={{
                      padding: 14,
                      backgroundColor: t.background,
                      borderWidth: 1,
                      borderColor: loadingCategories ? t.border + '60' : t.border,
                      borderRadius: 8,
                      marginBottom: 20,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: loadingCategories || categories.length === 0 ? 0.6 : 1,
                    }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {(() => {
                        const currentCat = categories.find(c => c.id?.toString() === createCategory);
                        const IconComponent = currentCat?.icon 
                          ? CATEGORY_ICONS[currentCat.icon.toLowerCase() as keyof typeof CATEGORY_ICONS]
                          : null;
                        
                        return (
                          <>
                            {IconComponent && (
                              <View style={{ width: 24, height: 24 }}>
                                {React.createElement(IconComponent, { size: 20, color: t.textPrimary })}
                              </View>
                            )}
                            <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 }}>
                              {currentCat ? currentCat.name : loadingCategories ? 'Loading...' : 'Select category'}
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                    {!loadingCategories && <Text style={{ color: t.textSecondary, fontSize: 16 }}>›</Text>}
                  </TouchableOpacity>
                </>
              )}

              {/* Notes */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                NOTES (OPTIONAL)
              </Text>
              <TextInput
                value={createNotes}
                onChangeText={setCreateNotes}
                placeholder="Add notes..."
                placeholderTextColor={t.textSecondary}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 8,
                  padding: 12,
                  color: t.textPrimary,
                  marginBottom: 20,
                  fontSize: 14,
                  textAlignVertical: 'top',
                }}
              />

              {/* Start Date */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                START DATE
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateDatePicker(true)}
                style={{
                  padding: 14,
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: 15 }}>
                  {createDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {/* Frequency */}
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                FREQUENCY
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {frequencyOptions.map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setCreateFrequency(freq)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: createFrequency === freq ? t.primary : t.border,
                      backgroundColor: createFrequency === freq ? t.primary + '15' : t.background,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: createFrequency === freq ? t.primary : t.textSecondary,
                        fontSize: 12,
                        fontWeight: createFrequency === freq ? '700' : '600',
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
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
                <TouchableOpacity
                  onPress={() => setShowCreateEndDatePicker(true)}
                  style={{
                    flex: 1,
                    padding: 14,
                    backgroundColor: t.background,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: createEndDate ? t.textPrimary : t.textSecondary, fontSize: 15 }}>
                    {createEndDate ? createEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No end date'}
                  </Text>
                </TouchableOpacity>
                {createEndDate && (
                  <TouchableOpacity
                    onPress={() => setCreateEndDate(null)}
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
                onPress={() => setShowCreateModal(false)}
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
                onPress={handleCreateRecurring}
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: t.primary,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Date Picker */}
      <CalendarModal
        visible={showCreateDatePicker}
        onClose={() => setShowCreateDatePicker(false)}
        onSelectDate={(date) => setCreateDate(date)}
        selectedDate={createDate}
        title="Start Date"
      />

      {/* Create End Date Picker */}
      <CalendarModal
        visible={showCreateEndDatePicker}
        onClose={() => setShowCreateEndDatePicker(false)}
        onSelectDate={(date) => setCreateEndDate(date)}
        selectedDate={createEndDate || new Date()}
        minDate={createDate}
        title="End Date"
      />
      {/* Wallet Selection Modal */}
      <SelectModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={(option) => setCreateWalletId(option.id as number)}
        options={wallets.map(w => ({
          id: w.id,
          label: w.name,
          secondaryLabel: w.currency,
        }))}
        selectedId={createWalletId}
        title={createType === 'transfer' ? 'From Wallet' : 'Select Wallet'}
      />

      {/* Destination Wallet Selection Modal */}
      {createType === 'transfer' && (
        <SelectModal
          visible={showToWalletModal}
          onClose={() => setShowToWalletModal(false)}
          onSelect={(option) => setCreateToWalletId(option.id as number)}
          options={wallets.filter(w => w.id !== createWalletId).map(w => ({
            id: w.id,
            label: w.name,
            secondaryLabel: w.currency,
          }))}
          selectedId={createToWalletId}
          title="To Wallet"
        />
      )}

      {/* Category Selection Modal */}
      {createType !== 'transfer' && (
        <SelectModal
          visible={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSelect={(option) => setCreateCategory(option.id.toString())}
          options={
            categoryHierarchy && categoryHierarchy.length > 0
              ? categoryHierarchy
                  .filter(item => {
                    if (createType === 'income') return item.category.type === 'income' || item.category.type === 'both';
                    return item.category.type === 'expense' || item.category.type === 'both';
                  })
                  .flatMap(item => [
                    {
                      id: item.category.id!,
                      label: item.category.name,
                      icon: item.category.icon,
                      indent: 0,
                      isParent: item.children.length > 0,
                    } as SelectOption,
                    ...(item.children.length > 0
                      ? item.children.map(child => ({
                          id: child.id!,
                          label: child.name,
                          icon: child.icon,
                          indent: 1,
                        } as SelectOption))
                      : [])
                  ])
              : []
          }
          selectedId={createCategory}
          title="Select Category"
          hierarchical={true}
        />
      )}

      {/* Themed Alert Component */}
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={effectiveMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}