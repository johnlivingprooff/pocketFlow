import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { OnboardingProgress } from './OnboardingProgress';
import { useColorScheme } from 'react-native';
import { theme } from '@/theme/theme';

const STEP_ORDER = ['welcome', 'profile', 'reminders', 'wallet', 'category', 'budget', 'goal', 'analytics'];

interface OnboardingHeaderProps {
  canGoBack: boolean;
  onBack?: () => void;
  backgroundColor?: string;
  currentStep?: string;
  showProgress?: boolean;
}

export function OnboardingHeader({
  canGoBack,
  onBack,
  backgroundColor,
  currentStep,
  showProgress = true,
}: OnboardingHeaderProps) {
  const systemColorScheme = useColorScheme();
  const t = theme('system', systemColorScheme || 'light');

  const numericStep = currentStep ? STEP_ORDER.indexOf(currentStep) + 1 : 0;
  const totalSteps = STEP_ORDER.length;

  return (
    <View style={[styles.container, backgroundColor && { backgroundColor }]}>
      {canGoBack && onBack && (
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
            <Text style={[styles.backButtonText, { color: t.textPrimary }]}>← Back</Text>
          </Pressable>
        </View>
      )}
      {showProgress && currentStep && (
        <OnboardingProgress currentStep={numericStep} totalSteps={totalSteps} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
