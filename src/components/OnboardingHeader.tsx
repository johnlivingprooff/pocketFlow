import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';

interface OnboardingHeaderProps {
  canGoBack: boolean;
  onBack: () => void;
  backgroundColor?: string;
}

/**
 * Header with back button for onboarding screens
 * Place this at the top of scrollview content
 */
export function OnboardingHeader({
  canGoBack,
  onBack,
  backgroundColor,
}: OnboardingHeaderProps) {
  if (!canGoBack) {
    return null;
  }

  return (
    <View style={[styles.header, backgroundColor && { backgroundColor }]}>
      <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 12,
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
