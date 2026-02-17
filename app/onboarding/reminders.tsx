import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme, colors } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { useOnboarding } from '@/store/useOnboarding';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import {
  cancelReminderSchedule,
  requestReminderPermission,
  scheduleNextEligibleReminder,
} from '@/lib/services/reminderNotificationService';

type PickerTarget = 'preferred' | 'quietStart' | 'quietEnd' | null;

function dateToTimeLocal(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function timeLocalToDate(value: string): Date {
  const [hoursText, minutesText] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const now = new Date();
  now.setHours(Number.isFinite(hours) ? hours : 20, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return now;
}

export default function OnboardingRemindersScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const {
    themeMode,
    remindersEnabled,
    reminderPreferredTimeLocal,
    reminderQuietHoursStart,
    reminderQuietHoursEnd,
    setRemindersEnabled,
    setReminderPreferredTimeLocal,
    setReminderQuietHours,
  } = useSettings();
  const {
    setCurrentStep,
    completeStep,
    previousSteps,
    goBackToPreviousStep,
    formData,
    saveFormData,
  } = useOnboarding();

  const t = useMemo(() => theme(themeMode, systemColorScheme || 'light'), [themeMode, systemColorScheme]);

  const [enabled, setEnabled] = useState<boolean>(
    formData.reminders?.enabled ?? remindersEnabled ?? false
  );
  const [preferredTimeLocal, setPreferredTimeLocal] = useState<string>(
    formData.reminders?.preferredTimeLocal ?? reminderPreferredTimeLocal ?? '20:00'
  );
  const [useQuietHours, setUseQuietHours] = useState<boolean>(
    Boolean(
      formData.reminders?.quietHoursStart ??
        formData.reminders?.quietHoursEnd ??
        reminderQuietHoursStart ??
        reminderQuietHoursEnd
    )
  );
  const [quietHoursStart, setQuietHoursStart] = useState<string>(
    formData.reminders?.quietHoursStart ?? reminderQuietHoursStart ?? '21:00'
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>(
    formData.reminders?.quietHoursEnd ?? reminderQuietHoursEnd ?? '07:00'
  );
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  useEffect(() => {
    saveFormData('reminders', {
      enabled,
      preferredTimeLocal,
      quietHoursStart: useQuietHours ? quietHoursStart : null,
      quietHoursEnd: useQuietHours ? quietHoursEnd : null,
    });
  }, [enabled, preferredTimeLocal, quietHoursStart, quietHoursEnd, useQuietHours, saveFormData]);

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
    const previousStep = previousSteps[previousSteps.length - 1];
    if (previousStep && stepRoutes[previousStep]) {
      goBackToPreviousStep();
      router.push(stepRoutes[previousStep]);
    }
  };

  const handleToggleEnabled = async (nextEnabled: boolean) => {
    if (!nextEnabled) {
      setEnabled(false);
      return;
    }

    const permission = await requestReminderPermission();
    if (permission !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'Notification access is required for reminders. You can enable it later from system settings.'
      );
      setEnabled(false);
      return;
    }

    setEnabled(true);
  };

  const handleContinue = async () => {
    setReminderPreferredTimeLocal(preferredTimeLocal);

    if (enabled && useQuietHours) {
      setReminderQuietHours(quietHoursStart, quietHoursEnd);
    } else {
      setReminderQuietHours(null, null);
    }

    setRemindersEnabled(enabled);

    if (enabled) {
      await scheduleNextEligibleReminder('onboarding_reminders');
    } else {
      await cancelReminderSchedule('onboarding_reminders_disabled');
    }

    completeStep('reminders');
    setCurrentStep('wallet');
    router.push('/onboarding/wallet');
  };

  const handleSkip = async () => {
    setRemindersEnabled(false);
    setReminderQuietHours(null, null);
    await cancelReminderSchedule('onboarding_reminders_skipped');

    completeStep('reminders');
    setCurrentStep('wallet');
    router.push('/onboarding/wallet');
  };

  const onTimePicked = (_event: unknown, selected?: Date) => {
    setPickerTarget(null);
    if (!selected) {
      return;
    }

    const next = dateToTimeLocal(selected);
    if (pickerTarget === 'preferred') {
      setPreferredTimeLocal(next);
      return;
    }
    if (pickerTarget === 'quietStart') {
      setQuietHoursStart(next);
      return;
    }
    if (pickerTarget === 'quietEnd') {
      setQuietHoursEnd(next);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingHeader canGoBack={previousSteps.length > 0} onBack={handleBack} currentStep="reminders" />

        <View style={styles.header}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>Reminders</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            We&apos;ll remind you once per day, and never more often than every 12 hours.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={styles.rowBetween}>
              <View style={styles.rowText}>
                <Text style={[styles.label, { color: t.textPrimary }]}>Enable reminders</Text>
                <Text style={[styles.helperText, { color: t.textSecondary }]}>
                  Keep expense tracking consistent with one gentle reminder.
                </Text>
              </View>
              <Switch value={enabled} onValueChange={handleToggleEnabled} />
            </View>
          </View>

          {enabled && (
            <>
              <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.label, { color: t.textPrimary }]}>Preferred reminder time</Text>
                <Pressable
                  onPress={() => setPickerTarget('preferred')}
                  style={[styles.timeButton, { backgroundColor: t.background, borderColor: t.border }]}
                >
                  <Text style={[styles.timeText, { color: t.textPrimary }]}>{preferredTimeLocal}</Text>
                </Pressable>
              </View>

              <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.label, { color: t.textPrimary }]}>Use quiet hours</Text>
                  <Switch value={useQuietHours} onValueChange={setUseQuietHours} />
                </View>

                {useQuietHours && (
                  <View style={styles.quietRow}>
                    <Pressable
                      onPress={() => setPickerTarget('quietStart')}
                      style={[styles.timeButton, styles.quietButton, { backgroundColor: t.background, borderColor: t.border }]}
                    >
                      <Text style={[styles.timeText, { color: t.textPrimary }]}>Start {quietHoursStart}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPickerTarget('quietEnd')}
                      style={[styles.timeButton, styles.quietButton, { backgroundColor: t.background, borderColor: t.border }]}
                    >
                      <Text style={[styles.timeText, { color: t.textPrimary }]}>End {quietHoursEnd}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.deepGold + '10' }]}>
          <Text style={[styles.infoText, { color: t.textPrimary }]}>
            This uses local notifications, works offline, and follows strict daily + spacing gates.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={[styles.button, { backgroundColor: t.primary }]} onPress={handleContinue}>
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Continue</Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: t.textSecondary }]}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>

      {pickerTarget && (
        <DateTimePicker
          value={
            pickerTarget === 'preferred'
              ? timeLocalToDate(preferredTimeLocal)
              : pickerTarget === 'quietStart'
              ? timeLocalToDate(quietHoursStart)
              : timeLocalToDate(quietHoursEnd)
          }
          mode="time"
          display="spinner"
          onChange={onTimePicked}
        />
      )}
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
    marginBottom: 28,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  quietRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quietButton: {
    flex: 1,
  },
  timeButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    padding: 10,
  },
  skipText: {
    fontSize: 15,
  },
});
