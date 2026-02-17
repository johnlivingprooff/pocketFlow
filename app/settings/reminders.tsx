import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/ThemedAlert';
import {
  cancelReminderSchedule,
  requestReminderPermission,
  scheduleReminderTestNotification,
  setRemindersEnabledAndReschedule,
  syncReminderPermissionStatus,
} from '@/lib/services/reminderNotificationService';

type PickerTarget = 'preferred' | 'quietStart' | 'quietEnd' | null;

function timeLocalToDate(value: string): Date {
  const [hoursText, minutesText] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const now = new Date();
  now.setHours(Number.isFinite(hours) ? hours : 20, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return now;
}

function dateToTimeLocal(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatUtc(isoUtc: string | null): string {
  if (!isoUtc) return 'Not scheduled';
  const parsed = new Date(isoUtc);
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled';
  return parsed.toLocaleString();
}

export default function ReminderSettingsScreen() {
  const {
    themeMode,
    remindersEnabled,
    reminderPreferredTimeLocal,
    reminderQuietHoursStart,
    reminderQuietHoursEnd,
    reminderLastDeliveredAtUtc,
    reminderNextScheduledAtUtc,
    reminderPermissionStatus,
    setReminderPreferredTimeLocal,
    setReminderQuietHours,
  } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = useMemo(() => theme(themeMode, systemColorScheme || 'light'), [themeMode, systemColorScheme]);
  const { alertConfig, showErrorAlert, showSuccessAlert, dismissAlert } = useAlert();

  const [enabled, setEnabled] = useState(remindersEnabled);
  const [preferredTimeLocal, setPreferredTimeLocal] = useState(reminderPreferredTimeLocal);
  const [useQuietHours, setUseQuietHours] = useState(Boolean(reminderQuietHoursStart && reminderQuietHoursEnd));
  const [quietHoursStart, setQuietHoursStart] = useState(reminderQuietHoursStart || '21:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState(reminderQuietHoursEnd || '07:00');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(reminderPermissionStatus);

  const handleRefreshPermission = async () => {
    const next = await syncReminderPermissionStatus();
    setPermissionStatus(next);

    if (next !== 'granted' && enabled) {
      setEnabled(false);
      await setRemindersEnabledAndReschedule(false);
      showErrorAlert(
        'Permission Revoked',
        'Notification permission is no longer granted. Reminders were turned off.'
      );
    }
  };

  const handleToggleEnabled = async (nextEnabled: boolean) => {
    if (!nextEnabled) {
      setEnabled(false);
      return;
    }

    const status = await requestReminderPermission();
    setPermissionStatus(status);

    if (status !== 'granted') {
      setEnabled(false);
      showErrorAlert(
        'Permission Required',
        'Reminders need notification permission. Enable it from system settings, then try again.'
      );
      return;
    }

    setEnabled(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      setReminderPreferredTimeLocal(preferredTimeLocal);
      if (enabled && useQuietHours) {
        setReminderQuietHours(quietHoursStart, quietHoursEnd);
      } else {
        setReminderQuietHours(null, null);
      }

      await setRemindersEnabledAndReschedule(enabled);
      const nextPermissionStatus = await syncReminderPermissionStatus();
      setPermissionStatus(nextPermissionStatus);

      if (!enabled) {
        await cancelReminderSchedule('settings_disabled');
        showSuccessAlert('Saved', 'Reminders disabled.');
        return;
      }

      if (nextPermissionStatus !== 'granted') {
        setEnabled(false);
        showErrorAlert(
          'Permission Missing',
          'Notification permission is required. Please enable notifications for pocketFlow in system settings.'
        );
        return;
      }

      showSuccessAlert('Saved', 'Reminder schedule updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      showErrorAlert('Permission Missing', 'Grant notification permission before sending a test notification.');
      return;
    }
    try {
      await scheduleReminderTestNotification(false);
      showSuccessAlert(
        'Test Sent',
        'A test notification has been sent. Check your notification tray.'
      );
    } catch (error) {
      showErrorAlert(
        'Test Failed',
        'Failed to send test notification. Please check your notification settings and try again.'
      );
    }
  };

  const onTimePicked = (_event: unknown, selectedDate?: Date) => {
    setPickerTarget(null);
    if (!selectedDate) {
      return;
    }

    const next = dateToTimeLocal(selectedDate);
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: t.textPrimary }]}>Enable reminders</Text>
              <Text style={[styles.subLabel, { color: t.textSecondary }]}>
                At most one reminder per local day, never less than 12 hours apart.
              </Text>
            </View>
            <Switch value={enabled} onValueChange={handleToggleEnabled} />
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: t.textSecondary }]}>Permission</Text>
            <Text style={[styles.metaValue, { color: t.textPrimary }]}>{permissionStatus}</Text>
          </View>
          <Pressable onPress={handleRefreshPermission} style={[styles.secondaryButton, { borderColor: t.border }]}>
            <Text style={[styles.secondaryButtonText, { color: t.textPrimary }]}>Refresh Permission</Text>
          </Pressable>
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
                <Text style={[styles.label, { color: t.textPrimary }]}>Quiet hours</Text>
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

        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.metaLabel, { color: t.textSecondary }]}>Last delivered (UTC)</Text>
          <Text style={[styles.metaValue, { color: t.textPrimary }]}>{formatUtc(reminderLastDeliveredAtUtc)}</Text>
          <Text style={[styles.metaLabel, { color: t.textSecondary, marginTop: 10 }]}>Next scheduled</Text>
          <Text style={[styles.metaValue, { color: t.textPrimary }]}>{formatUtc(reminderNextScheduledAtUtc)}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: t.primary, opacity: saving ? 0.65 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { borderColor: t.border, backgroundColor: t.card }]}
            onPress={handleTestNotification}
          >
            <Text style={[styles.secondaryButtonText, { color: t.textPrimary }]}>Send Test Notification</Text>
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
    padding: 16,
    paddingTop: 20,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
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
  actions: {
    gap: 10,
    marginTop: 6,
  },
  primaryButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
