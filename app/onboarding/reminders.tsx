import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
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

import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { useOnboarding } from '@/store/useOnboarding';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { HelpLink } from '@/components/HelpLink';
import {
  canAskForReminderPermissionAgain,
  requestReminderPermission,
  setRemindersEnabledAndReschedule,
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
    setReminderPreferredTimeLocal,
    setReminderQuietHours,
  } = useSettings();
  const {
    setCurrentStep,
    completeStep,
  } = useOnboarding();

  const t = useMemo(() => theme(themeMode, systemColorScheme || 'light'), [themeMode, systemColorScheme]);

  const [enabled, setEnabled] = useState<boolean>(
    remindersEnabled ?? false
  );
  const [preferredTimeLocal, setPreferredTimeLocal] = useState<string>(
    reminderPreferredTimeLocal ?? '20:00'
  );
  const [useQuietHours, setUseQuietHours] = useState<boolean>(
    Boolean(reminderQuietHoursStart ?? reminderQuietHoursEnd)
  );
  const [quietHoursStart, setQuietHoursStart] = useState<string>(
    reminderQuietHoursStart ?? '21:00'
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>(
    reminderQuietHoursEnd ?? '07:00'
  );
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const handleBack = () => {
    setCurrentStep('profile');
    router.push('/onboarding/profile');
  };

  const handleToggleEnabled = async (nextEnabled: boolean) => {
    if (!nextEnabled) {
      setEnabled(false);
      return;
    }

    const canAskAgainBeforeRequest = await canAskForReminderPermissionAgain();
    if (!canAskAgainBeforeRequest) {
      Alert.alert(
        'Enable Notifications',
        'Notifications are blocked for pocketFlow. Open system settings to enable notifications and turn reminders on again.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              void Linking.openSettings().catch(() => {
                Alert.alert(
                  'Open Settings Failed',
                  'Could not open system settings. Please open your device settings and enable notifications for pocketFlow.'
                );
              });
            },
          },
        ]
      );
      setEnabled(false);
      return;
    }

    const permission = await requestReminderPermission();
    if (permission !== 'granted') {
      const canAskAgain = await canAskForReminderPermissionAgain();
      if (!canAskAgain) {
        Alert.alert(
          'Enable Notifications',
          'Notifications are blocked for pocketFlow. Open system settings to enable notifications and turn reminders on again.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                void Linking.openSettings().catch(() => {
                  Alert.alert(
                    'Open Settings Failed',
                    'Could not open system settings. Please open your device settings and enable notifications for pocketFlow.'
                  );
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Permission Needed',
          'Notification access is required for reminders. Please allow notifications when prompted.'
        );
      }
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

    await setRemindersEnabledAndReschedule(enabled);

    completeStep('reminders');
    setCurrentStep('wallet');
    router.push('/onboarding/wallet');
  };

  const handleSkip = async () => {
    setReminderQuietHours(null, null);
    await setRemindersEnabledAndReschedule(false);

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
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: t.background }]) as any} edges={['left', 'right', 'top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingHeader canGoBack={true} onBack={handleBack} currentStep="reminders" />

        <View style={styles.header}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={StyleSheet.flatten([styles.title, { color: t.textPrimary }]) as any}>Reminders</Text>
          <Text style={StyleSheet.flatten([styles.subtitle, { color: t.textSecondary }]) as any}>
            We&apos;ll remind you once per day, and never more often than every 12 hours.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={StyleSheet.flatten([styles.card, { backgroundColor: t.card, borderColor: t.border }]) as any}>
            <View style={styles.rowBetween}>
              <View style={styles.rowText}>
                <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>Enable reminders</Text>
                <Text style={StyleSheet.flatten([styles.helperText, { color: t.textSecondary }]) as any}>
                  Keep expense tracking consistent with one gentle reminder.
                </Text>
              </View>
              <Switch value={enabled} onValueChange={handleToggleEnabled} />
            </View>
          </View>

          {enabled && (
            <>
              <View style={StyleSheet.flatten([styles.card, { backgroundColor: t.card, borderColor: t.border }]) as any}>
                <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>Preferred reminder time</Text>
                <Pressable
                  onPress={() => setPickerTarget('preferred')}
                  style={StyleSheet.flatten([styles.timeButton, { backgroundColor: t.background, borderColor: t.border }]) as any}
                >
                  <Text style={StyleSheet.flatten([styles.timeText, { color: t.textPrimary }]) as any}>{preferredTimeLocal}</Text>
                </Pressable>
              </View>

              <View style={StyleSheet.flatten([styles.card, { backgroundColor: t.card, borderColor: t.border }]) as any}>
                <View style={styles.rowBetween}>
                  <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>Use quiet hours</Text>
                  <Switch value={useQuietHours} onValueChange={setUseQuietHours} />
                </View>

                {useQuietHours && (
                  <View style={styles.quietRow}>
                    <Pressable
                      onPress={() => setPickerTarget('quietStart')}
                      style={StyleSheet.flatten([styles.timeButton, styles.quietButton, { backgroundColor: t.background, borderColor: t.border }]) as any}
                    >
                      <Text style={StyleSheet.flatten([styles.timeText, { color: t.textPrimary }]) as any}>Start {quietHoursStart}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPickerTarget('quietEnd')}
                      style={StyleSheet.flatten([styles.timeButton, styles.quietButton, { backgroundColor: t.background, borderColor: t.border }]) as any}
                    >
                      <Text style={StyleSheet.flatten([styles.timeText, { color: t.textPrimary }]) as any}>End {quietHoursEnd}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        <HelpLink
          title="Reminders"
          items={[
            'Uses local notifications and works offline.',
            'Follows strict daily + spacing gates to avoid notification fatigue.',
          ]}
        />

        <View style={styles.buttonContainer}>
          <Pressable style={StyleSheet.flatten([styles.button, { backgroundColor: t.primary }]) as any} onPress={handleContinue}>
            <Text style={StyleSheet.flatten([styles.buttonText, { color: '#FFFFFF' }]) as any}>Continue</Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={StyleSheet.flatten([styles.skipText, { color: t.textSecondary }]) as any}>Skip for now</Text>
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
