import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { addTransaction } from '../../src/lib/db/transactions';
import { SelectModal, SelectOption } from '../../src/components/SelectModal';
import { getCategories, type Category } from '../../src/lib/db/categories';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { formatShortDate } from '../../src/utils/date';

export default function TransactionTutorialScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const { setCurrentStep, completeStep, createdWalletId, previousSteps, goBackToPreviousStep } = useOnboarding();
  const router = useRouter();
  const t = theme(themeMode, systemColorScheme || 'light');

  const stepRoutes: Record<string, string> = {
    welcome: '/onboarding/welcome',
    profile: '/onboarding/profile',
    reminders: '/onboarding/reminders',
    wallet: '/onboarding/wallet',
    category: '/onboarding/category',
    budget: '/onboarding/budget',
    goal: '/onboarding/goal',
    transaction: '/onboarding/transaction',
    transfer: '/onboarding/transfer',
    analytics: '/onboarding/analytics',
  };

  const handleBack = () => {
    const prevStep = previousSteps[previousSteps.length - 1];
    if (prevStep && stepRoutes[prevStep]) {
      goBackToPreviousStep();
      router.push(stepRoutes[prevStep]);
    }
  };

  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories(transactionType).then(setCategories);
  }, [transactionType]);

  const categoryOptions = categories
    .filter(cat => cat.id !== undefined)
    .map(cat => ({ id: cat.id!.toString(), label: cat.name }));

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    setShowDatePicker(false);
  };

  const handleCreateTransaction = async () => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a category for your transaction.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (!createdWalletId) {
      Alert.alert('Error', 'No wallet found. Please complete the wallet step first.');
      return;
    }

    setIsCreating(true);
    try {
      const category = categories.find(c => c.id !== undefined && c.id.toString() === selectedCategory);
      
      await addTransaction({
        wallet_id: createdWalletId,
        category: category?.name || selectedCategory,
        amount: parsedAmount,
        type: transactionType,
        date: date.toISOString().split('T')[0],
        notes: notes.trim() || undefined,
        receipt_path: undefined,
        is_recurring: false,
        recurrence_frequency: undefined,
        recurrence_end_date: undefined,
      });

      completeStep('transaction');
      setCurrentStep('transfer');
      router.push('/onboarding/transfer');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      Alert.alert('Error', 'Could not create transaction. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    completeStep('transaction');
    setCurrentStep('transfer');
    router.push('/onboarding/transfer');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingHeader 
          canGoBack={previousSteps.length > 0}
          onBack={handleBack}
        />

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '78%', backgroundColor: colors.deepGold }]} />
          </View>
          <Text style={[styles.progressText, { color: t.textSecondary }]}>
            Step 7 of 9
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>💸</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Add a Transaction
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Record your first income or expense to get started
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Transaction Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.textPrimary }]}>
              Transaction Type
            </Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: transactionType === 'expense' ? colors.negativeRed + '20' : t.card,
                    borderColor: transactionType === 'expense' ? colors.negativeRed : t.border,
                  },
                ]}
                onPress={() => {
                  setTransactionType('expense');
                  setSelectedCategory('');
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color: transactionType === 'expense' ? colors.negativeRed : t.textPrimary,
                      fontWeight: transactionType === 'expense' ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  💸 Expense
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: transactionType === 'income' ? colors.positiveGreen + '20' : t.card,
                    borderColor: transactionType === 'income' ? colors.positiveGreen : t.border,
                  },
                ]}
                onPress={() => {
                  setTransactionType('income');
                  setSelectedCategory('');
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color: transactionType === 'income' ? colors.positiveGreen : t.textPrimary,
                      fontWeight: transactionType === 'income' ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  💰 Income
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.textPrimary }]}>
              Amount ({defaultCurrency}) <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: t.card,
                  color: t.textPrimary,
                  borderColor: t.border,
                },
              ]}
              placeholder="1000"
              placeholderTextColor={t.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.helperText, { color: t.textSecondary }]}>
              💡 Enter just the number, we'll track the rest
            </Text>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.textPrimary }]}>
              Category <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <Pressable
              style={[
                styles.input,
                {
                  backgroundColor: t.card,
                  borderColor: t.border,
                  justifyContent: 'center',
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[styles.selectText, { color: selectedCategory ? t.textPrimary : t.textSecondary }]}>
                {categories.find(c => c.id !== undefined && c.id.toString() === selectedCategory)?.name || 'Select a category'}
              </Text>
            </Pressable>
            <Text style={[styles.helperText, { color: t.textSecondary }]}>
              💡 Categories help organize your spending
            </Text>
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.textPrimary }]}>
              Date
            </Text>
            <Pressable
              style={[
                styles.input,
                {
                  backgroundColor: t.card,
                  borderColor: t.border,
                  justifyContent: 'center',
                },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.selectText, { color: t.textPrimary }]}>
                {formatShortDate(date)}
              </Text>
            </Pressable>
            <Text style={[styles.helperText, { color: t.textSecondary }]}>
              💡 When did this transaction happen?
            </Text>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.textPrimary }]}>
              Notes (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: t.card,
                  color: t.textPrimary,
                  borderColor: t.border,
                },
              ]}
              placeholder="What was this for?"
              placeholderTextColor={t.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
            <Text style={[styles.helperText, { color: t.textSecondary }]}>
              💡 Add details to remember later
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: t.primary, opacity: isCreating ? 0.6 : 1 },
            ]}
            onPress={handleCreateTransaction}
            disabled={isCreating}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isCreating ? 'Adding...' : 'Add Transaction'}
            </Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: t.textSecondary }]}>
              Skip this step
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      )}

      {/* Category Modal */}
      <SelectModal
        visible={showCategoryModal}
        title={`Select ${transactionType === 'expense' ? 'Expense' : 'Income'} Category`}
        options={categoryOptions}
        selectedId={selectedCategory}
        onSelect={(option: SelectOption) => {
          setSelectedCategory(option.id as string);
          setShowCategoryModal(false);
        }}
        onClose={() => setShowCategoryModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    minHeight: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 20,
    marginBottom: 24,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    fontSize: 15,
  },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  selectText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
  },
});
