import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/ThemedAlert';
import {
  canAskForReminderPermissionAgain,
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
  const { width } = useWindowDimensions();
  const t = useMemo(() => theme(themeMode, systemColorScheme || 'light'), [themeMode, systemColorScheme]);
  const { alertConfig, showAlert, showErrorAlert, showSuccessAlert, dismissAlert } = useAlert();
  const compact = width <= 360;

  const [enabled, setEnabled] = useState(remindersEnabled);
  const [preferredTimeLocal, setPreferredTimeLocal] = useState(reminderPreferredTimeLocal);
  const [useQuietHours, setUseQuietHours] = useState(Boolean(reminderQuietHoursStart && reminderQuietHoursEnd));
  const [quietHoursStart, setQuietHoursStart] = useState(reminderQuietHoursStart || '21:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState(reminderQuietHoursEnd || '07:00');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(reminderPermissionStatus);
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [awaitingSettingsReturn, setAwaitingSettingsReturn] = useState(false);
  const [autoEnableAfterSettings, setAutoEnableAfterSettings] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const persistedQuietEnabled = Boolean(reminderQuietHoursStart && reminderQuietHoursEnd);
  const persistedQuietStart = reminderQuietHoursStart || '21:00';
  const persistedQuietEnd = reminderQuietHoursEnd || '07:00';
  const hasUnsavedChanges =
    enabled !== remindersEnabled ||
    preferredTimeLocal !== reminderPreferredTimeLocal ||
    useQuietHours !== persistedQuietEnabled ||
    (useQuietHours &&
      (quietHoursStart !== persistedQuietStart || quietHoursEnd !== persistedQuietEnd));

  const reminderStatus = enabled
    ? permissionStatus === 'granted'
      ? 'active'
      : 'needs_permission'
    : 'off';
  const reminderStatusLabel =
    reminderStatus === 'active'
      ? 'Active'
      : reminderStatus === 'needs_permission'
        ? 'Action Needed'
        : 'Off';
  const reminderStatusMessage =
    reminderStatus === 'active'
      ? 'Daily reminder is ready and will follow your schedule rules.'
      : reminderStatus === 'needs_permission'
        ? 'Reminders are on, but notifications need access before delivery can happen.'
        : 'Reminders are currently turned off.';
  const reminderStatusColor =
    reminderStatus === 'active'
      ? t.success
      : reminderStatus === 'needs_permission'
        ? t.warning
        : t.textSecondary;
  const reminderStatusBg =
    reminderStatus === 'active'
      ? `${t.success}14`
      : reminderStatus === 'needs_permission'
        ? `${t.warning}14`
        : `${t.border}`;

  const refreshPermissionMeta = async () => {
    const nextStatus = await syncReminderPermissionStatus();
    const nextCanAskAgain = await canAskForReminderPermissionAgain();
    setPermissionStatus(nextStatus);
    setCanAskAgain(nextCanAskAgain);
    return { nextStatus, nextCanAskAgain };
  };

  const openNotificationSettings = async (autoEnableOnReturn: boolean = false) => {
    setAwaitingSettingsReturn(true);
    setAutoEnableAfterSettings(autoEnableOnReturn);
    try {
      await Linking.openSettings();
    } catch {
      setAwaitingSettingsReturn(false);
      setAutoEnableAfterSettings(false);
      showErrorAlert(
        'Open Settings Failed',
        'Could not open system settings. Please open your device settings and enable notifications for pocketFlow.'
      );
    }
  };

  const promptEnableNotifications = (message: string, autoEnableOnReturn: boolean = false) => {
    showAlert('Enable Notifications', message, [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Open Settings',
        style: 'success',
        onPress: () => {
          void openNotificationSettings(autoEnableOnReturn);
        },
      },
    ]);
  };

  useEffect(() => {
    let mounted = true;

    const syncFromSystem = async (fromAppResume: boolean) => {
      const { nextStatus } = await refreshPermissionMeta();
      if (!mounted) return;

      if (awaitingSettingsReturn && fromAppResume) {
        if (nextStatus === 'granted') {
          if (autoEnableAfterSettings) {
            setEnabled(true);
            showSuccessAlert(
              'Notifications Enabled',
              'Great. Notifications are now enabled. Tap Save Changes to finish turning reminders back on.'
            );
          } else {
            showSuccessAlert(
              'Notifications Enabled',
              'Notifications are enabled. You can now send a test reminder or turn reminders back on.'
            );
          }
        }
        setAwaitingSettingsReturn(false);
        setAutoEnableAfterSettings(false);
      }
    };

    void syncFromSystem(false);

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      const resumedFromBackground = appStateRef.current !== 'active' && state === 'active';
      appStateRef.current = state;
      if (resumedFromBackground) {
        void syncFromSystem(true);
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [awaitingSettingsReturn, autoEnableAfterSettings, showSuccessAlert]);

  const handleRefreshPermission = async () => {
    const { nextStatus } = await refreshPermissionMeta();

    if (nextStatus !== 'granted' && enabled) {
      setEnabled(false);
      await setRemindersEnabledAndReschedule(false);
      promptEnableNotifications(
        'Notification permission is no longer granted, so reminders were turned off. Re-enable notifications in system settings to turn reminders back on.',
        true
      );
    }
  };

  const handleToggleEnabled = async (nextEnabled: boolean) => {
    if (!nextEnabled) {
      setEnabled(false);
      return;
    }

    const { nextStatus: currentStatus, nextCanAskAgain } = await refreshPermissionMeta();

    if (currentStatus === 'granted') {
      setEnabled(true);
      return;
    }

    if (!nextCanAskAgain) {
      setEnabled(false);
      promptEnableNotifications(
        'Notifications are currently blocked for pocketFlow. To turn reminders back on, enable notifications in system settings.',
        true
      );
      return;
    }

    const status = await requestReminderPermission();
    setPermissionStatus(status);

    if (status !== 'granted') {
      setEnabled(false);
      const canAskLater = await canAskForReminderPermissionAgain();
      setCanAskAgain(canAskLater);
      if (!canAskLater) {
        promptEnableNotifications(
          'Notifications are currently blocked for pocketFlow. To turn reminders back on, enable notifications in system settings.',
          true
        );
      } else {
        showErrorAlert(
          'Permission Required',
          'Reminders need notification permission. Please allow notifications when prompted and try again.'
        );
      }
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
      const { nextStatus: nextPermissionStatus } = await refreshPermissionMeta();

      if (!enabled) {
        await cancelReminderSchedule('settings_disabled');
        showSuccessAlert('Saved', 'Reminders disabled.');
        return;
      }

      if (nextPermissionStatus !== 'granted') {
        setEnabled(false);
        promptEnableNotifications(
          'Notification permission is required to schedule reminders. Enable notifications for pocketFlow in system settings and try again.',
          true
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
      promptEnableNotifications(
        'Grant notification permission before sending a test reminder. Open system settings to enable notifications for pocketFlow.'
      );
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

  const saveDisabled = saving || !hasUnsavedChanges;
  const saveButtonLabel = saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]}> 
          <View
            style={[
              styles.statusHero,
              {
                backgroundColor: reminderStatusBg,
                borderColor: `${reminderStatusColor}44`,
              },
            ]}
          >
            <View style={styles.statusHeroRow}>
              <Text style={[styles.statusHeroTitle, compact && styles.statusHeroTitleCompact, { color: t.textPrimary }]}>Reminder Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${reminderStatusColor}18`, borderColor: `${reminderStatusColor}40` }]}>
                <Text style={[styles.statusBadgeText, { color: reminderStatusColor }]}>{reminderStatusLabel}</Text>
              </View>
            </View>
            <Text style={[styles.statusHeroMessage, compact && styles.statusHeroMessageCompact, { color: t.textSecondary }]}>
              {reminderStatusMessage}
            </Text>
          </View>

          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={[styles.label, compact && styles.labelCompact, { color: t.textPrimary }]}>Enable reminders</Text>
              <Text style={[styles.subLabel, compact && styles.subLabelCompact, { color: t.textSecondary }]}> 
                At most one reminder per local day, never less than 12 hours apart.
              </Text>
            </View>
            <Switch value={enabled} onValueChange={handleToggleEnabled} />
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: t.textSecondary }]}>Permission</Text>
            <Text
              style={[
                styles.metaValue,
                {
                  color:
                    permissionStatus === 'granted'
                      ? t.success
                      : permissionStatus === 'undetermined'
                        ? t.warning
                        : t.danger,
                },
              ]}
            >
              {permissionStatus === 'granted'
                ? 'Allowed'
                : permissionStatus === 'undetermined'
                  ? 'Not set'
                  : 'Blocked'}
            </Text>
          </View>

          {permissionStatus !== 'granted' && (
            <View
              style={[
                styles.permissionCallout,
                {
                  backgroundColor: canAskAgain ? `${t.warning}12` : `${t.danger}12`,
                  borderColor: canAskAgain ? `${t.warning}40` : `${t.danger}40`,
                },
              ]}
            >
              <Text style={[styles.permissionCalloutText, { color: t.textPrimary }]}>
                {canAskAgain
                  ? 'Turn on notifications to re-enable reminders.'
                  : 'Notifications are blocked at system level. Open settings to enable reminders again.'}
              </Text>
              <Pressable
                onPress={canAskAgain ? () => void handleToggleEnabled(true) : () => void openNotificationSettings(true)}
                style={[styles.permissionCalloutButton, compact && styles.permissionCalloutButtonCompact, { backgroundColor: t.primary }]}
              >
                <Text style={styles.permissionCalloutButtonText}>
                  {canAskAgain ? 'Allow Notifications' : 'Open Settings'}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={handleRefreshPermission} style={[styles.secondaryButton, { borderColor: t.border }]}> 
            <Text style={[styles.secondaryButtonText, { color: t.textPrimary }]}>Refresh Permission</Text>
          </Pressable>
        </View>

        {enabled && (
          <>
            <View style={[styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]}>
              <Text style={[styles.label, { color: t.textPrimary }]}>Preferred reminder time</Text>
              <Pressable
                onPress={() => setPickerTarget('preferred')}
                style={[styles.timeButton, { backgroundColor: t.background, borderColor: t.border }]}
              >
                <Text style={[styles.timeText, { color: t.textPrimary }]}>{preferredTimeLocal}</Text>
              </Pressable>
            </View>

            <View style={[styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]}>
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

        <View style={[styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]}> 
          <Text style={[styles.metaLabel, { color: t.textSecondary }]}>Last delivered (UTC)</Text>
          <Text style={[styles.metaValue, { color: t.textPrimary }]}>{formatUtc(reminderLastDeliveredAtUtc)}</Text>
          <Text style={[styles.metaLabel, { color: t.textSecondary, marginTop: 10 }]}>Next scheduled</Text>
          <Text style={[styles.metaValue, { color: t.textPrimary }]}>{formatUtc(reminderNextScheduledAtUtc)}</Text>
        </View>

        <View style={styles.actions}>
          {hasUnsavedChanges && (
            <Text style={[styles.pendingChangesText, { color: t.textSecondary }]}>You have unsaved reminder changes.</Text>
          )}
          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: hasUnsavedChanges ? t.primary : t.border,
                opacity: saving ? 0.65 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={saveDisabled}
          >
            <Text style={styles.primaryButtonText}>{saveButtonLabel}</Text>
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
  contentCompact: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  cardCompact: {
    padding: 12,
    gap: 10,
  },
  statusHero: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  statusHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusHeroTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusHeroTitleCompact: {
    fontSize: 13,
  },
  statusHeroMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusHeroMessageCompact: {
    fontSize: 11,
    lineHeight: 16,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
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
  labelCompact: {
    fontSize: 15,
  },
  subLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  subLabelCompact: {
    fontSize: 11,
    lineHeight: 16,
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
  permissionCallout: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  permissionCalloutText: {
    fontSize: 12,
    lineHeight: 18,
  },
  permissionCalloutButton: {
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },
  permissionCalloutButtonCompact: {
    paddingVertical: 8,
  },
  permissionCalloutButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  pendingChangesText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
