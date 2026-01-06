import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, useColorScheme, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';

/**
 * Developer Settings Screen
 * Provides utilities for testing onboarding and other dev features
 * TODO: Remove or protect with feature flag in production
 */
export default function DevSettingsScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const { isOnboardingComplete, resetOnboarding, currentStep, completedSteps } = useOnboarding();
  const router = useRouter();
  const t = theme(themeMode);
  const { alertConfig, showConfirmAlert, dismissAlert } = useAlert();

  const handleResetOnboarding = () => {
    if (Platform.OS === 'web') {
      showConfirmAlert(
        'Restart Onboarding',
        'This will reset the onboarding flow. The app will restart as if it\'s a fresh install.',
        () => {
          resetOnboarding();
          router.replace('/onboarding/welcome');
        }
      );
    } else {
      Alert.alert(
        'Restart Onboarding',
        'This will reset the onboarding flow. The app will restart as if it\'s a fresh install.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              resetOnboarding();
              router.replace('/onboarding/welcome');
            },
          },
        ]
      );
    }
  };

  const handleStartOnboarding = () => {
    router.push('/onboarding/welcome');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Developer Settings</Text>
        
        {/* Onboarding Status */}
        <View style={[styles.section, { backgroundColor: t.card }]}>
          <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Onboarding Status</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: t.textSecondary }]}>Completed:</Text>
            <Text style={[styles.value, { color: isOnboardingComplete ? colors.positiveGreen : colors.negativeRed }]}>
              {isOnboardingComplete ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: t.textSecondary }]}>Current Step:</Text>
            <Text style={[styles.value, { color: t.textPrimary }]}>{currentStep}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: t.textSecondary }]}>Steps Completed:</Text>
            <Text style={[styles.value, { color: t.textPrimary }]}>{completedSteps.length}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, { backgroundColor: colors.deepGold }]}
            onPress={handleStartOnboarding}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              View Onboarding
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: colors.negativeRed }]}
            onPress={handleResetOnboarding}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Restart Onboarding
            </Text>
          </Pressable>
        </View>

        {/* Warning */}
        <View style={[styles.warning, { backgroundColor: colors.negativeRed + '15' }]}>
          <Text style={[styles.warningText, { color: colors.negativeRed }]}>
            ⚠️ This screen is for development only. It will be removed or protected in production builds.
          </Text>
        </View>
      </ScrollView>

      {/* Web: ThemedAlert */}
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  warning: {
    padding: 16,
    borderRadius: 10,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
