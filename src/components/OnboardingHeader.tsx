import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { OnboardingProgress } from './OnboardingProgress';
import { useColorScheme } from 'react-native';
import { theme } from '@/theme/theme';

interface OnboardingHeaderProps {
  canGoBack: boolean;
  onBack: () => void;
  backgroundColor?: string;
  currentStep?: string;
  showProgress?: boolean;
}

/**
 * Header with back button and progress indicator for onboarding screens
 * Place this at the top of scrollview content
 */
export function OnboardingHeader({
  canGoBack,
  onBack,
  backgroundColor,
  currentStep,
  showProgress = true,
}: OnboardingHeaderProps) {
  const systemColorScheme = useColorScheme();
  const t = theme('system', systemColorScheme || 'light');

  return (
    <View style={[styles.container, backgroundColor && { backgroundColor }]}>
      {canGoBack && (
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
            <Text style={[styles.backButtonText, { color: t.textPrimary }]}>← Back</Text>
          </Pressable>
        </View>
      )}
      {showProgress && currentStep && (
        <OnboardingProgress
          currentStep={currentStep}
          backgroundColor="transparent"
          textColor={t.textSecondary}
          accentColor={t.primary}
        />
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
