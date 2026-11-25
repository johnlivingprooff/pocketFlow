import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Linking,
  Platform,
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
  cancelReminder,
  getReminderPermissionInfo,
  getReminderPlan,
  requestReminderPermission,
  scheduleReminderTestNotification,
  setRemindersEnabledAndReschedule,
} from '@/lib/services/reminderNotificationService';
import {
  ADAPTIVE_MIN_SAMPLES,
  computeNextEligibleReminder,
  formatLocalTime,
  isQuietHoursValid,
} from '@/lib/services/reminderEligibility';

type PickerTarget = 'preferred' | 'quietStart' | 'quietEnd' | null;

const QUIET_PRESETS = [
  { label: '21:00 – 07:00', start: '21:00', end: '07:00' },
  { label: '22:00 – 06:00', start: '22:00', end: '06:00' },
  { label: '23:00 – 08:00', start: '23:00', end: '08:00' },
];

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

export default function ReminderSettingsScreen() {
  const {
    themeMode,
    remindersEnabled,
    reminderPreferredTimeLocal,
    reminderQuietHoursStart,
    reminderQuietHoursEnd,
    reminderAdaptiveEnabled,
    reminderAdaptiveTimeLocal,
    reminderEngagementTimesLocal,
    reminderPermissionStatus,
    setReminderPreferredTimeLocal,
    setReminderQuietHours,
    setReminderAdaptiveEnabled,
    clearReminderAdaptiveData,
  } = useSettings();
  const systemColorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const t = useMemo(() => theme(themeMode, systemColorScheme || 'light'), [themeMode, systemColorScheme]);
  const { alertConfig, showAlert, showErrorAlert, showSuccessAlert, dismissAlert } = useAlert();
  const compact = width <= 360;

  const [enabled, setEnabled] = useState(remindersEnabled);
  const [preferredTimeLocal, setPreferredTimeLocal] = useState(reminderPreferredTimeLocal);
  const [quietEnabled, setQuietEnabled] = useState(
    isQuietHoursValid(reminderQuietHoursStart, reminderQuietHoursEnd)
  );
  const [quietStart, setQuietStart] = useState(reminderQuietHoursStart ?? '21:00');
  const [quietEnd, setQuietEnd] = useState(reminderQuietHoursEnd ?? '07:00');
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(reminderAdaptiveEnabled);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(reminderPermissionStatus);
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [awaitingSettingsReturn, setAwaitingSettingsReturn] = useState(false);
  const [autoEnableAfterSettings, setAutoEnableAfterSettings] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const persistedQuietEnabled = isQuietHoursValid(reminderQuietHoursStart, reminderQuietHoursEnd);
  const hasUnsavedChanges =
    enabled !== remindersEnabled ||
    preferredTimeLocal !== reminderPreferredTimeLocal ||
    quietEnabled !== persistedQuietEnabled ||
    (quietEnabled && (quietStart !== reminderQuietHoursStart || quietEnd !== reminderQuietHoursEnd)) ||
    adaptiveEnabled !== reminderAdaptiveEnabled;

  const effectiveTimeLocal = adaptiveEnabled && reminderAdaptiveTimeLocal
    ? reminderAdaptiveTimeLocal
    : preferredTimeLocal;

  // Preview the next eligible fire using the same engine that schedules it.
  const nextPreview = useMemo(() => {
    try {
      return computeNextEligibleReminder({
        now: new Date(),
        preferredTimeLocal: effectiveTimeLocal,
        quietHoursStart: quietEnabled && isQuietHoursValid(quietStart, quietEnd) ? quietStart : null,
        quietHoursEnd: quietEnabled && isQuietHoursValid(quietStart, quietEnd) ? quietEnd : null,
        lastDeliveredAtUtc: useSettings.getState().reminderLastDeliveredAtUtc,
        lastDeliveredLocalDate: useSettings.getState().reminderLastDeliveredLocalDate,
      });
    } catch {
      return null;
    }
  }, [effectiveTimeLocal, quietEnabled, quietStart, quietEnd]);

  const hasEnoughAdaptiveSamples =
    reminderEngagementTimesLocal.length >= ADAPTIVE_MIN_SAMPLES;

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
      ? `Next reminder around ${formatLocalTime(nextPreview?.candidateLocal ?? new Date())}.${nextPreview?.quietHoursAdjusted ? ' Adjusted for quiet hours.' : ''}${nextPreview?.minimumSpacingApplied ? ' Delayed to keep 12h spacing.' : ''}`
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
    // Both values come from one native permission read.
    const { status: nextStatus, canAskAgain: nextCanAskAgain } =
      await getReminderPermissionInfo();
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
    if (quietEnabled && !isQuietHoursValid(quietStart, quietEnd)) {
      showErrorAlert(
        'Invalid Quiet Hours',
        'Start and end times must be different and in HH:MM format.'
      );
      return;
    }

    setSaving(true);
    try {
      setReminderPreferredTimeLocal(preferredTimeLocal);
      setReminderAdaptiveEnabled(adaptiveEnabled);
      setReminderQuietHours(
        quietEnabled && isQuietHoursValid(quietStart, quietEnd) ? quietStart : null,
        quietEnabled && isQuietHoursValid(quietStart, quietEnd) ? quietEnd : null
      );

      try {
        await setRemindersEnabledAndReschedule(enabled);
      } catch (scheduleError) {
        const message =
          scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
        showErrorAlert(
          'Schedule Failed',
          `Could not schedule the daily reminder (${message}). Check that notifications are allowed for pocketFlow, then try again.`
        );
        return;
      }
      const { nextStatus: nextPermissionStatus } = await refreshPermissionMeta();

      if (!enabled) {
        await cancelReminder();
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

      showSuccessAlert(
        'Saved',
        `Reminder set for ${effectiveTimeLocal}${adaptiveEnabled && hasEnoughAdaptiveSamples ? ' (learned from your activity)' : ''}.`
      );
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
      await scheduleReminderTestNotification();
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
    if (!selectedDate) return;
    const value = dateToTimeLocal(selectedDate);
    if (pickerTarget === 'preferred') {
      setPreferredTimeLocal(value);
    } else if (pickerTarget === 'quietStart') {
      setQuietStart(value);
    } else if (pickerTarget === 'quietEnd') {
      setQuietEnd(value);
    }
    // The iOS spinner emits changes continuously; keep it open until Done.
    if (Platform.OS !== 'ios') setPickerTarget(null);
  };

  const saveDisabled = saving || !hasUnsavedChanges;
  const saveButtonLabel = saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes';

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: t.background }]) as any} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={StyleSheet.flatten([styles.content, compact && styles.contentCompact]) as any}>
        <View style={StyleSheet.flatten([styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]) as any}> 
          <View
            style={StyleSheet.flatten([
              styles.statusHero,
              {
                backgroundColor: reminderStatusBg,
                borderColor: `${reminderStatusColor}44`,
              },
            ]) as any}
          >
            <View style={styles.statusHeroRow}>
              <Text style={StyleSheet.flatten([styles.statusHeroTitle, compact && styles.statusHeroTitleCompact, { color: t.textPrimary }]) as any}>Reminder Status</Text>
              <View style={StyleSheet.flatten([styles.statusBadge, { backgroundColor: `${reminderStatusColor}18`, borderColor: `${reminderStatusColor}40` }]) as any}>
                <Text style={StyleSheet.flatten([styles.statusBadgeText, { color: reminderStatusColor }]) as any}>{reminderStatusLabel}</Text>
              </View>
            </View>
            <Text style={StyleSheet.flatten([styles.statusHeroMessage, compact && styles.statusHeroMessageCompact, { color: t.textSecondary }]) as any}>
              {reminderStatusMessage}
            </Text>
          </View>

          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={StyleSheet.flatten([styles.label, compact && styles.labelCompact, { color: t.textPrimary }]) as any}>Enable reminders</Text>
              <Text style={StyleSheet.flatten([styles.subLabel, compact && styles.subLabelCompact, { color: t.textSecondary }]) as any}> 
                One reminder each day at your chosen time.
              </Text>
            </View>
            <Switch value={enabled} onValueChange={handleToggleEnabled} />
          </View>

          <View style={styles.metaRow}>
            <Text style={StyleSheet.flatten([styles.metaLabel, { color: t.textSecondary }]) as any}>Permission</Text>
            <Text
              style={StyleSheet.flatten([
                styles.metaValue,
                {
                  color:
                    permissionStatus === 'granted'
                      ? t.success
                      : permissionStatus === 'undetermined'
                        ? t.warning
                        : t.danger,
                },
              ]) as any}
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
              style={StyleSheet.flatten([
                styles.permissionCallout,
                {
                  backgroundColor: canAskAgain ? `${t.warning}12` : `${t.danger}12`,
                  borderColor: canAskAgain ? `${t.warning}40` : `${t.danger}40`,
                },
              ]) as any}
            >
              <Text style={StyleSheet.flatten([styles.permissionCalloutText, { color: t.textPrimary }]) as any}>
                {canAskAgain
                  ? 'Turn on notifications to re-enable reminders.'
                  : 'Notifications are blocked at system level. Open settings to enable reminders again.'}
              </Text>
              <Pressable
                onPress={canAskAgain ? () => void handleToggleEnabled(true) : () => void openNotificationSettings(true)}
                style={StyleSheet.flatten([styles.permissionCalloutButton, compact && styles.permissionCalloutButtonCompact, { backgroundColor: t.primary }]) as any}
              >
                <Text style={styles.permissionCalloutButtonText}>
                  {canAskAgain ? 'Allow Notifications' : 'Open Settings'}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={handleRefreshPermission} style={StyleSheet.flatten([styles.secondaryButton, { borderColor: t.border }]) as any}> 
            <Text style={StyleSheet.flatten([styles.secondaryButtonText, { color: t.textPrimary }]) as any}>Refresh Permission</Text>
          </Pressable>
        </View>

        {enabled && (
          <>
            <View style={StyleSheet.flatten([styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]) as any}>
              <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>Preferred reminder time</Text>
              <Pressable
                onPress={() => setPickerTarget('preferred')}
                accessibilityRole="button"
                accessibilityLabel="Choose preferred reminder time"
                style={StyleSheet.flatten([styles.timeButton, { backgroundColor: t.background, borderColor: t.border }]) as any}
              >
                <Text style={StyleSheet.flatten([styles.timeText, { color: t.textPrimary }]) as any}>{preferredTimeLocal}</Text>
              </Pressable>
              <Text style={StyleSheet.flatten([styles.subLabel, { color: t.textSecondary }]) as any}>
                {adaptiveEnabled && hasEnoughAdaptiveSamples
                  ? `Learned time ${reminderAdaptiveTimeLocal} is being used instead. Turn off adaptive timing to keep ${preferredTimeLocal} exactly.`
                  : 'This is the starting time. Adaptive timing can move it to when you actually open the app.'}
              </Text>
              {nextPreview && (
                <View style={StyleSheet.flatten([styles.hintBox, { backgroundColor: t.background, borderColor: t.border }]) as any}>
                  <Text style={StyleSheet.flatten([styles.hintText, { color: t.textSecondary }]) as any}>
                    Next eligible reminder: {formatLocalTime(nextPreview.candidateLocal)}
                    {nextPreview.quietHoursAdjusted ? ' · moved to end of quiet hours' : ''}
                    {nextPreview.minimumSpacingApplied ? ' · 12h spacing applied' : ''}
                    {nextPreview.dailyGateApplied ? ' · next local day' : ''}
                  </Text>
                </View>
              )}
            </View>

            <View style={StyleSheet.flatten([styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]) as any}>
              <View style={styles.rowBetween}>
                <View style={styles.rowText}>
                  <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>Quiet hours</Text>
                  <Text style={StyleSheet.flatten([styles.subLabel, { color: t.textSecondary }]) as any}>
                    No reminders during this window. They move to the end of it.
                  </Text>
                </View>
                <Switch
                  value={quietEnabled}
                  onValueChange={(value) => {
                    setQuietEnabled(value);
                    if (value && !isQuietHoursValid(quietStart, quietEnd)) {
                      setQuietStart('21:00');
                      setQuietEnd('07:00');
                    }
                  }}
                />
              </View>

              {quietEnabled && (
                <>
                  <View style={styles.chipRow}>
                    {QUIET_PRESETS.map((preset) => {
                      const active = quietStart === preset.start && quietEnd === preset.end;
                      return (
                        <Pressable
                          key={preset.label}
                          onPress={() => {
                            setQuietStart(preset.start);
                            setQuietEnd(preset.end);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Quiet hours ${preset.label}`}
                          style={StyleSheet.flatten([
                            styles.chip,
                            { backgroundColor: active ? t.primary : t.background, borderColor: active ? t.primary : t.border },
                          ]) as any}
                        >
                          <Text style={[styles.chipText, { color: active ? t.background : t.textSecondary }]}>{preset.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.timeRow}>
                    <Pressable
                      onPress={() => setPickerTarget('quietStart')}
                      accessibilityRole="button"
                      accessibilityLabel="Choose quiet hours start"
                      style={StyleSheet.flatten([styles.timeButton, { backgroundColor: t.background, borderColor: t.border }]) as any}
                    >
                      <Text style={StyleSheet.flatten([styles.subLabelCompact, { color: t.textSecondary }]) as any}>From</Text>
                      <Text style={StyleSheet.flatten([styles.timeText, { color: t.textPrimary }]) as any}>{quietStart}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPickerTarget('quietEnd')}
                      accessibilityRole="button"
                      accessibilityLabel="Choose quiet hours end"
                      style={StyleSheet.flatten([styles.timeButton, { backgroundColor: t.background, borderColor: t.border }]) as any}
                    >
                      <Text style={StyleSheet.flatten([styles.subLabelCompact, { color: t.textSecondary }]) as any}>To</Text>
                      <Text style={StyleSheet.flatten([styles.timeText, { color: t.textPrimary }]) as any}>{quietEnd}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            <View style={StyleSheet.flatten([styles.card, compact && styles.cardCompact, { backgroundColor: t.card, borderColor: t.border }]) as any}>
              <View style={styles.rowBetween}>
                <View style={styles.rowText}>
                  <Text style={StyleSheet.flatten([styles.label, { color: t.textPrimary }]) as any}>Adaptive timing</Text>
                  <Text style={StyleSheet.flatten([styles.subLabel, { color: t.textSecondary }]) as any}>
                    Learns from reminder taps and app opens shortly after a reminder.
                  </Text>
                </View>
                <Switch value={adaptiveEnabled} onValueChange={setAdaptiveEnabled} />
              </View>
              <Text style={StyleSheet.flatten([styles.subLabel, { color: t.textSecondary }]) as any}>
                {hasEnoughAdaptiveSamples
                  ? `Based on ${reminderEngagementTimesLocal.length} opens, your suggested time is ${reminderAdaptiveTimeLocal}.`
                  : `Collecting activity: ${reminderEngagementTimesLocal.length}/${ADAPTIVE_MIN_SAMPLES} opens needed.`}
              </Text>
              {reminderEngagementTimesLocal.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset learned reminder times"
                  onPress={() => {
                    clearReminderAdaptiveData();
                    showSuccessAlert('Reset', 'Learned reminder times cleared.');
                  }}
                  style={StyleSheet.flatten([styles.secondaryButton, { borderColor: t.border }]) as any}
                >
                  <Text style={StyleSheet.flatten([styles.secondaryButtonText, { color: t.textPrimary }]) as any}>Reset learned times</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        <View style={styles.actions}>
          <Text style={StyleSheet.flatten([styles.subLabel, compact && styles.subLabelCompact, { color: t.textSecondary }]) as any}>
            The test sends immediately. The daily reminder fires each day at your chosen time.
          </Text>
          {hasUnsavedChanges && (
            <Text style={StyleSheet.flatten([styles.pendingChangesText, { color: t.textSecondary }]) as any}>You have unsaved reminder changes.</Text>
          )}
          <Pressable
            style={StyleSheet.flatten([
              styles.primaryButton,
              {
                backgroundColor: hasUnsavedChanges ? t.primary : t.border,
                opacity: saving ? 0.65 : 1,
              },
            ]) as any}
            onPress={handleSave}
            disabled={saveDisabled}
          >
            <Text style={styles.primaryButtonText}>{saveButtonLabel}</Text>
          </Pressable>

          <Pressable
            style={StyleSheet.flatten([styles.secondaryButton, { borderColor: t.border, backgroundColor: t.card }]) as any}
            onPress={handleTestNotification}
          >
            <Text style={StyleSheet.flatten([styles.secondaryButtonText, { color: t.textPrimary }]) as any}>Send Test Notification</Text>
          </Pressable>
        </View>
      </ScrollView>

      {pickerTarget && (
        <View style={{ backgroundColor: t.card, padding: 16 }}>
          <DateTimePicker
            value={timeLocalToDate(
              pickerTarget === 'quietStart'
                ? quietStart
                : pickerTarget === 'quietEnd'
                  ? quietEnd
                  : preferredTimeLocal
            )}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimePicked}
          />
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={() => setPickerTarget(null)}
              accessibilityRole="button"
              accessibilityLabel="Done choosing time"
              style={{ alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 16 }}
            >
              <Text style={{ color: t.primary, fontWeight: '700' }}>Done</Text>
            </Pressable>
          )}
        </View>
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
    paddingTop: 3,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hintBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
