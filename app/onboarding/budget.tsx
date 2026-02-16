import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { createBudget } from '../../src/lib/db/budgets';
import { SelectModal, SelectOption } from '../../src/components/SelectModal';
import { getCategories, type Category } from '../../src/lib/db/categories';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { useColorScheme } from 'react-native';

const PERIOD_TYPES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export default function BudgetTutorialScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const { setCurrentStep, completeStep, createdWalletId, previousSteps, goBackToPreviousStep } = useOnboarding();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
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

  const [budgetName, setBudgetName] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [periodType, setPeriodType] = useState('Monthly');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories('expense').then(setCategories);
  }, []);

  const categoryOptions = categories
    .filter(cat => cat.id !== undefined)
    .map(cat => ({ id: cat.id!.toString(), label: cat.name }));

  const handleCreateBudget = async () => {
    if (!budgetName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your budget.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a category for your budget.');
      return;
    }

    const amount = parseFloat(limitAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount.');
      return;
    }

    setIsCreating(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      
      // Calculate end date based on period
      let endDate: Date;
      if (periodType === 'Daily') {
        endDate = new Date(today);
      } else if (periodType === 'Weekly') {
        endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (periodType === 'Monthly') {
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else {
        endDate = new Date(today.getFullYear(), 11, 31);
      }

      const category = categories.find(c => c.id !== undefined && c.id.toString() === selectedCategory);
      
      const result = await createBudget({
        name: budgetName.trim(),
        categoryIds: category?.id ? [category.id] : [],
        subcategoryIds: [],
        limitAmount: amount,
        periodType: periodType.toLowerCase() as any,
        startDate,
        endDate: endDate.toISOString().split('T')[0],
        notes: undefined,
        linkedWalletIds: createdWalletId ? [createdWalletId] : [],
      });

      completeStep('budget');
      setCurrentStep('goal');
      router.push('/onboarding/goal');
    } catch (error) {
      console.error('Failed to create budget:', error);
      Alert.alert('Error', 'Could not create budget. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    completeStep('budget');
    setCurrentStep('goal');
    router.push('/onboarding/goal');
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
            <View style={[styles.progressFill, { width: '56%', backgroundColor: colors.deepGold }]} />
          </View>
          <Text style={[styles.progressText, { color: t.textSecondary }]}>
            Step 5 of 9
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>📊</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Create a Budget
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Budgets help you control spending in specific categories. Set limits and track your progress!
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Budget Name <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  color: t.textPrimary,
                  borderColor: colors.mutedGrey + '30',
                },
              ]}
              placeholder="e.g., Monthly Groceries, Transportation Budget"
              placeholderTextColor={t.textSecondary}
              value={budgetName}
              onChangeText={setBudgetName}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Category <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <Pressable
              style={[
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  borderColor: colors.mutedGrey + '30',
                  justifyContent: 'center',
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[styles.selectText, { color: selectedCategory ? t.textPrimary : t.textSecondary }]}>
                {categories.find(c => c.id !== undefined && c.id.toString() === selectedCategory)?.name || 'Select a category'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Budget Amount ({defaultCurrency}) <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  color: t.textPrimary,
                  borderColor: colors.mutedGrey + '30',
                },
              ]}
              placeholder="5000"
              placeholderTextColor={t.textSecondary}
              value={limitAmount}
              onChangeText={setLimitAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Budget Period
            </Text>
            <Pressable
              style={[
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  borderColor: colors.mutedGrey + '30',
                  justifyContent: 'center',
                },
              ]}
              onPress={() => setShowPeriodModal(true)}
            >
              <Text style={[styles.selectText, { color: t.textPrimary }]}>
                {periodType}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.deepGold + '10' }]}>
          <Text style={[styles.infoText, { color: t.textPrimary }]}>
            💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> The app will alert you when you're close to or over your budget!
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: t.primary, opacity: isCreating ? 0.6 : 1 },
            ]}
            onPress={handleCreateBudget}
            disabled={isCreating}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isCreating ? 'Creating...' : 'Create Budget'}
            </Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: t.textSecondary }]}>
              Skip this step
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modals */}
      <SelectModal
        visible={showPeriodModal}
        title="Select Period"
        options={PERIOD_TYPES.map(p => ({ id: p, label: p }))}
        selectedId={periodType}
        onSelect={(option: SelectOption) => {
          setPeriodType(option.id as string);
          setShowPeriodModal(false);
        }}
        onClose={() => setShowPeriodModal(false)}
        searchable={false}
      />

      <SelectModal
        visible={showCategoryModal}
        title="Select Category"
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
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  selectText: {
    fontSize: 16,
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
