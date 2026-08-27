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
import { HelpLink } from '../../src/components/HelpLink';
import { useColorScheme } from 'react-native';

export default function GoalTutorialScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const { setCurrentStep, completeStep, createdWalletId } = useOnboarding();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const handleBack = () => {
    setCurrentStep('budget');
    router.push('/onboarding/budget');
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
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: t.background }]) as any} edges={['left', 'right', 'top', 'bottom']}>
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
          canGoBack={true}
          onBack={handleBack}
          currentStep="goal"
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={StyleSheet.flatten([styles.title, { color: t.textPrimary }]) as any}>
            Create a Savings Goal
          </Text>
          <Text style={StyleSheet.flatten([styles.subtitle, { color: t.textSecondary }]) as any}>
            Set financial goals and track your progress towards achieving them!
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>
              Goal Name <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={StyleSheet.flatten([
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  color: t.textPrimary,
                  borderColor: colors.mutedGrey + '30',
                },
              ]) as any}
              placeholder="e.g., New Laptop, Emergency Fund, Vacation"
              placeholderTextColor={t.textSecondary}
              value={goalName}
              onChangeText={setGoalName}
            />
          </View>

          <View style={styles.field}>
            <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>
              Target Amount ({defaultCurrency}) <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={StyleSheet.flatten([
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  color: t.textPrimary,
                  borderColor: colors.mutedGrey + '30',
                },
              ]) as any}
              placeholder="50000"
              placeholderTextColor={t.textSecondary}
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>
              Time to Achieve (months) <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={StyleSheet.flatten([
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  color: t.textPrimary,
                  borderColor: colors.mutedGrey + '30',
                },
              ]) as any}
              placeholder="3"
              placeholderTextColor={t.textSecondary}
              value={targetMonths}
              onChangeText={setTargetMonths}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <HelpLink
          title="Tip"
          items={['Link goals to specific wallets to automatically track your progress as you save!']}
        />

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={StyleSheet.flatten([
              styles.button,
              { backgroundColor: t.primary, opacity: isCreating ? 0.6 : 1 },
            ]) as any}
            onPress={handleCreateGoal}
            disabled={isCreating}
          >
            <Text style={StyleSheet.flatten([styles.buttonText, { color: '#FFFFFF' }]) as any}>
              {isCreating ? 'Creating...' : 'Create Goal'}
            </Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={StyleSheet.flatten([styles.skipText, { color: t.textSecondary }]) as any}>
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
