import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOnboarding, ONBOARDING_STEPS } from '@/store/useOnboarding';

interface OnboardingProgressProps {
  currentStep: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

/**
 * Progress indicator for onboarding flow
 * Shows current step number and total steps
 */
export function OnboardingProgress({
  currentStep,
  backgroundColor = 'transparent',
  textColor = '#666',
  accentColor = '#84670B',
}: OnboardingProgressProps) {
  // Get the index of current step (excluding welcome)
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep as any);
  // Total is all steps except welcome (welcome is step 0)
  const totalSteps = ONBOARDING_STEPS.length - 1;
  // Current step number for display (1-based, excluding welcome)
  const stepNumber = currentIndex > 0 ? currentIndex : 1;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(stepNumber / totalSteps) * 100}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.stepText, { color: textColor }]}>
        Step {stepNumber} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});
