import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { log, warn, error as logError } from '@/utils/logger';
import { useSettings, ReminderPermissionStatus } from '@/store/useStore';
import {
  isInsideQuietHours,
  DEFAULT_REMINDER_BODY,
  DEFAULT_REMINDER_TITLE,
} from './reminderEligibility';

export const REMINDER_CHANNEL_ID = 'expense-log-reminder';
export const REMINDER_NOTIFICATION_ID = 'daily-expense-reminder';
export const REMINDER_NOTIFICATION_KIND = 'expense_log_reminder';
export const REMINDER_DEEP_LINK = '/transactions/add?type=expense';

// Set up the foreground handler once at module load (not inside a function).
// Test notifications (isTest: true) always show so users can verify the
// channel/permission path. Real reminders respect the enabled flag and
// quiet hours. NOTE: this handler only affects foreground presentation –
// background/killed notifications are shown by the OS regardless.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    try {
      const data = (notification?.request?.content?.data ?? {}) as Record<string, unknown>;
      if (data?.isTest === true) {
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      }
      const { reminderQuietHoursStart, reminderQuietHoursEnd, remindersEnabled } =
        useSettings.getState();
      const show =
        remindersEnabled &&
        !isInsideQuietHours(new Date(), reminderQuietHoursStart, reminderQuietHoursEnd);
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      };
    } catch {
      // Never let the handler time out (OS discards after ~3s): fail open
      // for tests, fail closed otherwise is handled by caller default.
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
  },
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Expense reminders',
    description: 'Daily reminder to log expenses',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  });
}

export function parsePreferredTime(timeLocal: string): { hour: number; minute: number } {
  const [h, m] = timeLocal.split(':').map(Number);
  const hour = Number.isFinite(h) ? Math.trunc(h) : 20;
  const minute = Number.isFinite(m) ? Math.trunc(m) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid reminder time "${timeLocal}". Expected HH:MM (00:00–23:59).`);
  }
  return { hour, minute };
}

/** Single place that builds the daily trigger so schedule + verify stay in sync. */
export function buildDailyTrigger(hour: number, minute: number) {
  return {
    type: SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
  } as const;
}

function buildReminderContent(isTest: boolean) {
  return {
    title: DEFAULT_REMINDER_TITLE,
    body: DEFAULT_REMINDER_BODY,
    data: {
      kind: REMINDER_NOTIFICATION_KIND,
      deepLink: REMINDER_DEEP_LINK,
      ...(isTest ? { isTest: true } : {}),
    },
    ...(Platform.OS === 'android' ? { android: { channelId: REMINDER_CHANNEL_ID } } : {}),
  };
}

/** Local fallback for "next fire" when getNextTriggerDateAsync is unavailable. */
function fallbackNextFireUtc(hour: number, minute: number, from: Date = new Date()): string {
  const candidate = new Date(from);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.toISOString();
}

async function persistNextScheduledAt(
  hour: number,
  minute: number,
  triggerForQuery: unknown
): Promise<string | null> {
  try {
    const nextMs = await Notifications.getNextTriggerDateAsync(triggerForQuery as never);
    const iso = typeof nextMs === 'number' ? new Date(nextMs).toISOString() : null;
    useSettings.getState().setReminderNextScheduledAtUtc(iso);
    return iso;
  } catch (err) {
    // getNextTriggerDateAsync can reject on some platforms – fall back to local math
    // so the UI never stays stuck on "Not scheduled" after a successful schedule.
    const iso = fallbackNextFireUtc(hour, minute);
    useSettings.getState().setReminderNextScheduledAtUtc(iso);
    warn('[Reminder] getNextTriggerDateAsync failed, using fallback', {
      error: err instanceof Error ? err.message : String(err),
      fallbackUtc: iso,
    });
    return iso;
  }
}

function toReminderPermissionStatus(
  result: Notifications.NotificationPermissionsStatus
): ReminderPermissionStatus {
  if (result.granted) return 'granted';
  if (
    result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    result.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  return result.canAskAgain ? 'undetermined' : 'denied';
}

export async function syncReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  const result = await Notifications.getPermissionsAsync();
  const status = toReminderPermissionStatus(result);
  useSettings.getState().setReminderPermissionStatus(status);
  return status;
}

export async function requestReminderPermission(): Promise<ReminderPermissionStatus> {
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  const status = toReminderPermissionStatus(result);
  useSettings.getState().setReminderPermissionStatus(status);
  return status;
}

export async function canAskForReminderPermissionAgain(): Promise<boolean> {
  const result = await Notifications.getPermissionsAsync();
  return result.canAskAgain;
}

/** Schedule (or reschedule) the single daily repeating reminder. */
export async function scheduleReminder(preferredTimeLocal: string): Promise<void> {
  if (Platform.OS === 'web') {
    warn('[Reminder] scheduleReminder is a no-op on web');
    return;
  }
  const { hour, minute } = parsePreferredTime(preferredTimeLocal);
  const trigger = buildDailyTrigger(hour, minute);

  try {
    await ensureChannel();
    // Cancel any existing reminder before scheduling a new one.
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_NOTIFICATION_ID,
      content: buildReminderContent(false),
      trigger,
    });

    // Verify the OS actually accepted it – scheduleNotificationAsync can
    // resolve while the alarm is silently dropped (Doze / OEM killers /
    // exact-alarm denial). If verification fails we throw so the settings
    // UI can show a real error instead of a fake "Saved".
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const ours = pending.find((n) => n.identifier === REMINDER_NOTIFICATION_ID);
    if (!ours) {
      throw new Error(
        'System did not retain the scheduled reminder. Check battery optimization / exact-alarm permission.'
      );
    }

    const nextUtc = await persistNextScheduledAt(hour, minute, trigger);
    log('[Reminder] Daily reminder scheduled', { hour, minute, nextUtc });
  } catch (err) {
    useSettings.getState().setReminderNextScheduledAtUtc(null);
    logError('[Reminder] Failed to schedule daily reminder', {
      preferredTimeLocal,
      hour,
      minute,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});
  } finally {
    useSettings.getState().setReminderNextScheduledAtUtc(null);
    log('[Reminder] Daily reminder cancelled');
  }
}

/** Called when the user toggles reminders on/off or changes the time. */
export async function setRemindersEnabledAndReschedule(enabled: boolean): Promise<void> {
  useSettings.getState().setRemindersEnabled(enabled);

  if (!enabled) {
    await cancelReminder();
    return;
  }

  if (Platform.OS === 'web') {
    warn('[Reminder] Reminders are not supported on web');
    return;
  }

  let status = await syncReminderPermissionStatus();

  if (status !== 'granted') {
    status = await requestReminderPermission();
  }

  if (status !== 'granted') {
    useSettings.getState().setRemindersEnabled(false);
    await cancelReminder();
    warn('[Reminder] Permission not granted – reminders disabled');
    return;
  }

  // NOTE: read preferred time AFTER the enabled flag + permission flow so a
  // just-picked time (persisted by the caller before invoking us) is honored.
  const { reminderPreferredTimeLocal } = useSettings.getState();
  await scheduleReminder(reminderPreferredTimeLocal);
}

/** Best-effort read of a daily trigger's hour/minute from a pending request. */
function pendingTriggerHourMinute(
  pending: Notifications.NotificationRequest
): { hour: number; minute: number } | null {
  const trigger = pending.trigger as unknown as {
    type?: string;
    hour?: unknown;
    minute?: unknown;
    value?: unknown;
    dateComponents?: { hour?: unknown; minute?: unknown };
  } | null;
  if (!trigger || typeof trigger !== 'object') return null;
  // Android daily: { type:'daily', hour, minute }. iOS serializes the daily
  // trigger as a calendar trigger – cover both shapes.
  const hourRaw = trigger.hour ?? trigger.dateComponents?.hour ?? (trigger.value as Record<string, unknown> | undefined)?.hour;
  const minuteRaw = trigger.minute ?? trigger.dateComponents?.minute ?? (trigger.value as Record<string, unknown> | undefined)?.minute;
  if (typeof hourRaw === 'number' && typeof minuteRaw === 'number') {
    return { hour: hourRaw, minute: minuteRaw };
  }
  return null;
}

/** Called on app start / foreground to ensure the schedule is still in place. */
export async function runReminderRuntimeGateCheck(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const { remindersEnabled, reminderPreferredTimeLocal } = useSettings.getState();
    if (!remindersEnabled) {
      // Self-heal: a stale alarm may survive a disable that previously failed
      // to cancel (crash / reinstall edge). Don't let it keep firing.
      try {
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        if (pending.some((n) => n.identifier === REMINDER_NOTIFICATION_ID)) {
          log('[Reminder] Runtime check: reminders disabled but alarm still pending, cancelling');
          await cancelReminder();
        }
      } catch {
        // best effort only
      }
      return;
    }

    const status = await syncReminderPermissionStatus();
    if (status !== 'granted') {
      warn('[Reminder] Runtime check: permission not granted, skipping');
      return;
    }

    const { hour: wantHour, minute: wantMinute } = parsePreferredTime(reminderPreferredTimeLocal);

    // Verify the notification is still scheduled (e.g. after device reboot).
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const ours = pending.find((n) => n.identifier === REMINDER_NOTIFICATION_ID);
    if (!ours) {
      log('[Reminder] Runtime check: reminder missing, rescheduling');
      await scheduleReminder(reminderPreferredTimeLocal);
      return;
    }

    // Self-heal time drift: the stored preference may have changed (or
    // rehydrated after a race) without a reschedule. The old code only
    // checked existence, so a stale time would fire forever at the wrong
    // hour and look "broken" to the user.
    const have = pendingTriggerHourMinute(ours);
    if (have && (have.hour !== wantHour || have.minute !== wantMinute)) {
      log('[Reminder] Runtime check: scheduled time drifted, rescheduling', {
        scheduled: have,
        preferred: { hour: wantHour, minute: wantMinute },
      });
      await scheduleReminder(reminderPreferredTimeLocal);
      return;
    }

    // Keep the "Next scheduled" label truthful even when nothing changed.
    await persistNextScheduledAt(wantHour, wantMinute, buildDailyTrigger(wantHour, wantMinute));
  } catch (err) {
    // Gate checks run on every foreground – they must never crash startup.
    warn('[Reminder] Runtime check failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function scheduleReminderTestNotification(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Test notifications are not supported on web');
  }
  await ensureChannel();
  const status = await syncReminderPermissionStatus();
  if (status !== 'granted') {
    const next = await requestReminderPermission();
    if (next !== 'granted') throw new Error('Notification permission not granted');
  }

  await Notifications.scheduleNotificationAsync({
    content: buildReminderContent(true),
    trigger: null, // immediate – bypasses AlarmManager, which is why tests
    // can succeed while daily alarms are blocked (exact-alarm denial,
    // battery optimization, OEM task killers).
  });

  log('[Reminder] Test notification sent');
}

export interface ReminderDiagnostics {
  remindersEnabled: boolean;
  preferredTimeLocal: string;
  permissionStatus: string;
  pendingCount: number;
  scheduledExists: boolean;
  scheduledHour: number | null;
  scheduledMinute: number | null;
  nextScheduledAtUtc: string | null;
  lastDeliveredAtUtc: string | null;
  /** Human-readable verdict for the settings screen. */
  verdict: 'ok' | 'disabled' | 'no_permission' | 'not_scheduled' | 'time_mismatch';
}

/** Inspect OS state vs stored prefs – powers the settings status card. */
export async function getReminderDiagnostics(): Promise<ReminderDiagnostics> {
  const state = useSettings.getState();
  const base = {
    remindersEnabled: state.remindersEnabled,
    preferredTimeLocal: state.reminderPreferredTimeLocal,
    permissionStatus: state.reminderPermissionStatus,
    nextScheduledAtUtc: state.reminderNextScheduledAtUtc,
    lastDeliveredAtUtc: state.reminderLastDeliveredAtUtc,
  };
  if (Platform.OS === 'web') {
    return {
      ...base,
      pendingCount: 0,
      scheduledExists: false,
      scheduledHour: null,
      scheduledMinute: null,
      verdict: 'disabled',
    };
  }
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const ours = pending.find((n) => n.identifier === REMINDER_NOTIFICATION_ID);
    const hm = ours ? pendingTriggerHourMinute(ours) : null;
    let want: { hour: number; minute: number } | null = null;
    try {
      want = parsePreferredTime(state.reminderPreferredTimeLocal);
    } catch {
      want = null;
    }
    const verdict: ReminderDiagnostics['verdict'] = !state.remindersEnabled
      ? 'disabled'
      : state.reminderPermissionStatus !== 'granted'
        ? 'no_permission'
        : !ours
          ? 'not_scheduled'
          : want && hm && (want.hour !== hm.hour || want.minute !== hm.minute)
            ? 'time_mismatch'
            : 'ok';
    return {
      ...base,
      pendingCount: pending.length,
      scheduledExists: Boolean(ours),
      scheduledHour: hm?.hour ?? null,
      scheduledMinute: hm?.minute ?? null,
      verdict,
    };
  } catch {
    return {
      ...base,
      pendingCount: 0,
      scheduledExists: false,
      scheduledHour: null,
      scheduledMinute: null,
      verdict: state.remindersEnabled ? 'not_scheduled' : 'disabled',
    };
  }
}

/** Record a real (non-test) delivery so "Last delivered" is truthful. */
export function markReminderDeliveredFromNotification(notification: Notifications.Notification): void {
  try {
    const data = (notification?.request?.content?.data ?? {}) as Record<string, unknown>;
    if (data?.kind !== REMINDER_NOTIFICATION_KIND || data?.isTest === true) return;
    const now = new Date();
    const pad = (v: number) => `${v}`.padStart(2, '0');
    const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    useSettings.getState().setReminderLastDelivered(now.toISOString(), localDate);
    log('[Reminder] Delivery recorded', { atUtc: now.toISOString() });
  } catch (err) {
    warn('[Reminder] Failed to record delivery', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function extractReminderDeepLink(
  response: Notifications.NotificationResponse
): string | null {
  const data = response.notification.request.content.data as Record<string, unknown>;
  if (data?.kind !== REMINDER_NOTIFICATION_KIND) return null;
  return typeof data.deepLink === 'string' ? data.deepLink : null;
}
