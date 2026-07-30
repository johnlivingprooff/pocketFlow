import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { log, warn } from '@/utils/logger';
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
// Returns shouldShowAlert: false during quiet hours so the notification is
// silently delivered but not shown as a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => {
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

function parsePreferredTime(timeLocal: string): { hour: number; minute: number } {
  const [h, m] = timeLocal.split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : 20, minute: Number.isFinite(m) ? m : 0 };
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
  await ensureChannel();
  // Cancel any existing reminder before scheduling a new one.
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});

  const { hour, minute } = parsePreferredTime(preferredTimeLocal);

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_NOTIFICATION_ID,
    content: {
      title: DEFAULT_REMINDER_TITLE,
      body: DEFAULT_REMINDER_BODY,
      data: { kind: REMINDER_NOTIFICATION_KIND, deepLink: REMINDER_DEEP_LINK },
      ...(Platform.OS === 'android' && { android: { channelId: REMINDER_CHANNEL_ID } }),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' && { channelId: REMINDER_CHANNEL_ID }),
    },
  });

  log('[Reminder] Daily reminder scheduled', { hour, minute });
}

export async function cancelReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});
  log('[Reminder] Daily reminder cancelled');
}

/** Called when the user toggles reminders on/off or changes the time. */
export async function setRemindersEnabledAndReschedule(enabled: boolean): Promise<void> {
  useSettings.getState().setRemindersEnabled(enabled);

  if (!enabled) {
    await cancelReminder();
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

  const { reminderPreferredTimeLocal } = useSettings.getState();
  await scheduleReminder(reminderPreferredTimeLocal);
}

/** Called on app start / foreground to ensure the schedule is still in place. */
export async function runReminderRuntimeGateCheck(): Promise<void> {
  const { remindersEnabled, reminderPreferredTimeLocal } = useSettings.getState();
  if (!remindersEnabled) return;

  const status = await syncReminderPermissionStatus();
  if (status !== 'granted') {
    warn('[Reminder] Runtime check: permission not granted, skipping');
    return;
  }

  // Verify the notification is still scheduled (e.g. after device reboot).
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const exists = pending.some((n) => n.identifier === REMINDER_NOTIFICATION_ID);
  if (!exists) {
    log('[Reminder] Runtime check: reminder missing, rescheduling');
    await scheduleReminder(reminderPreferredTimeLocal);
  }
}

export async function scheduleReminderTestNotification(): Promise<void> {
  await ensureChannel();
  const status = await syncReminderPermissionStatus();
  if (status !== 'granted') {
    const next = await requestReminderPermission();
    if (next !== 'granted') throw new Error('Notification permission not granted');
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: DEFAULT_REMINDER_TITLE,
      body: DEFAULT_REMINDER_BODY,
      data: { kind: REMINDER_NOTIFICATION_KIND, deepLink: REMINDER_DEEP_LINK, isTest: true },
      ...(Platform.OS === 'android' && { android: { channelId: REMINDER_CHANNEL_ID } }),
    },
    trigger: null, // immediate
  });

  log('[Reminder] Test notification sent');
}

export function extractReminderDeepLink(
  response: Notifications.NotificationResponse
): string | null {
  const data = response.notification.request.content.data as Record<string, unknown>;
  if (data?.kind !== REMINDER_NOTIFICATION_KIND) return null;
  return typeof data.deepLink === 'string' ? data.deepLink : null;
}
