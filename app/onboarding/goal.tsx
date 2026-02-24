import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { createGoal } from '../../src/lib/db/goals';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { useColorScheme } from 'react-native';

export default function GoalTutorialScreen() {
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
    analytics: '/onboarding/analytics',
  };

  const handleBack = () => {
    const prevStep = previousSteps[previousSteps.length - 1];
    if (prevStep && stepRoutes[prevStep]) {
      goBackToPreviousStep();
      router.push(stepRoutes[prevStep]);
    }
  };

  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetMonths, setTargetMonths] = useState('3');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGoal = async () => {
    if (!goalName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your goal.');
      return;
    }

    const amount = parseFloat(targetAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid target amount.');
      return;
    }

    const months = parseInt(targetMonths);
    if (!months || months <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid number of months.');
      return;
    }

    setIsCreating(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      
      const targetDate = new Date(today);
      targetDate.setMonth(targetDate.getMonth() + months);
      
      const result = await createGoal({
        name: goalName.trim(),
        targetAmount: amount,
        startDate,
        targetDate: targetDate.toISOString().split('T')[0],
        notes: undefined,
        linkedWalletIds: createdWalletId ? [createdWalletId] : [],
      });

      completeStep('goal');
      setCurrentStep('analytics');
      router.push('/onboarding/analytics');
    } catch (error) {
      console.error('Failed to create goal:', error);
      Alert.alert('Error', 'Could not create goal. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    completeStep('goal');
    setCurrentStep('analytics');
    router.push('/onboarding/analytics');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <OnboardingHeader
          canGoBack={previousSteps.length > 0}
          onBack={handleBack}
          currentStep="goal"
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Create a Savings Goal
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Set financial goals and track your progress towards achieving them!
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Goal Name <Text style={{ color: colors.negativeRed }}>*</Text>
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
              placeholder="e.g., New Laptop, Emergency Fund, Vacation"
              placeholderTextColor={t.textSecondary}
              value={goalName}
              onChangeText={setGoalName}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Target Amount ({defaultCurrency}) <Text style={{ color: colors.negativeRed }}>*</Text>
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
              placeholder="50000"
              placeholderTextColor={t.textSecondary}
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Time to Achieve (months) <Text style={{ color: colors.negativeRed }}>*</Text>
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
              placeholder="3"
              placeholderTextColor={t.textSecondary}
              value={targetMonths}
              onChangeText={setTargetMonths}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.positiveGreen + '10' }]}>
          <Text style={[styles.infoText, { color: t.textPrimary }]}>
            💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> Link goals to specific wallets to automatically track your progress as you save!
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: t.primary, opacity: isCreating ? 0.6 : 1 },
            ]}
            onPress={handleCreateGoal}
            disabled={isCreating}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isCreating ? 'Creating...' : 'Create Goal'}
            </Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: t.textSecondary }]}>
              Skip this step
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
