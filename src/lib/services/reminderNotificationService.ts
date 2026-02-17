import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { log, warn, error as logError } from '@/utils/logger';
import { useSettings, ReminderPermissionStatus } from '@/store/useStore';
import {
  computeNextEligibleReminder,
  evaluateReminderDeliveryGate,
  formatLocalDate,
  DEFAULT_REMINDER_BODY,
  DEFAULT_REMINDER_TITLE,
} from './reminderEligibility';

export const REMINDER_CHANNEL_ID = 'expense-log-reminder';
export const REMINDER_NOTIFICATION_KIND = 'expense_log_reminder';
export const REMINDER_DEEP_LINK = '/transactions/add?type=expense';

let remindersInitialized = false;

interface ReminderNotificationData {
  kind?: string;
  deepLink?: string;
  isTest?: boolean;
  testCountsAsReal?: boolean;
}

function toReminderPermissionStatus(permissions: Notifications.NotificationPermissionsStatus): ReminderPermissionStatus {
  if (permissions.granted) {
    return 'granted';
  }

  const isProvisional =
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (isProvisional) {
    return 'granted';
  }

  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

function getReminderData(notification: Notifications.Notification): ReminderNotificationData {
  return (notification.request.content.data || {}) as ReminderNotificationData;
}

function isReminderNotification(notification: Notifications.Notification): boolean {
  const data = getReminderData(notification);
  return data.kind === REMINDER_NOTIFICATION_KIND;
}

function reminderBehavior(shouldShowAlert: boolean): Notifications.NotificationBehavior {
  return {
    shouldShowAlert,
    shouldPlaySound: false,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior;
}

async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Expense reminders',
    description: 'Daily reminder to log expenses',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: undefined,
  });
}

export async function syncReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  const permissions = await Notifications.getPermissionsAsync();
  const status = toReminderPermissionStatus(permissions);
  useSettings.getState().setReminderPermissionStatus(status);
  return status;
}

export async function requestReminderPermission(): Promise<ReminderPermissionStatus> {
  // First check if we can ask for permissions
  const canAsk = await Notifications.canAskForPermissionsAsync();
  
  if (!canAsk) {
    // Permission already denied, get current status
    const permissions = await Notifications.getPermissionsAsync();
    const status = toReminderPermissionStatus(permissions);
    useSettings.getState().setReminderPermissionStatus(status);
    return status;
  }

  const result = await Notifications.requestPermissionsAsync();
  const status = toReminderPermissionStatus(result);
  useSettings.getState().setReminderPermissionStatus(status);
  return status;
}

export async function initializeReminderNotifications(): Promise<void> {
  if (remindersInitialized) {
    return;
  }

  await ensureReminderChannel();

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      if (!isReminderNotification(notification)) {
        return reminderBehavior(true);
      }

      const data = getReminderData(notification);
      
      // Test notifications should always show without delivery gate checks
      if (data.isTest) {
        return reminderBehavior(true);
      }

      const state = useSettings.getState();
      const gate = evaluateReminderDeliveryGate({
        now: new Date(),
        remindersEnabled: state.remindersEnabled,
        permissionGranted: state.reminderPermissionStatus === 'granted',
        quietHoursStart: state.reminderQuietHoursStart,
        quietHoursEnd: state.reminderQuietHoursEnd,
        lastDeliveredAtUtc: state.reminderLastDeliveredAtUtc,
        lastDeliveredLocalDate: state.reminderLastDeliveredLocalDate,
      });

      if (!gate.allowed) {
        warn(`[Reminder] Delivery blocked by gate: ${gate.reason}`);
        setTimeout(() => {
          void scheduleNextEligibleReminder(`delivery_gate_blocked_${gate.reason}`);
        }, 0);
        return reminderBehavior(false);
      }

      const now = new Date();
      state.setReminderLastDelivered(now.toISOString(), formatLocalDate(now));
      state.setReminderNextScheduledAtUtc(null);

      setTimeout(() => {
        void scheduleNextEligibleReminder('delivery_success');
      }, 0);

      return reminderBehavior(true);
    },
  });

  remindersInitialized = true;
}

export async function cancelReminderSchedule(reason: string = 'cancelled'): Promise<void> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const reminderNotifications = pending.filter((item: Notifications.NotificationRequest) => {
      const data = (item.content.data || {}) as ReminderNotificationData;
      return data.kind === REMINDER_NOTIFICATION_KIND && !data.isTest;
    });

    await Promise.all(
      reminderNotifications.map((item: Notifications.NotificationRequest) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier)
      )
    );

    useSettings.getState().setReminderNextScheduledAtUtc(null);
    log(`[Reminder] Cancelled ${reminderNotifications.length} scheduled reminder(s): ${reason}`);
  } catch (error) {
    logError('[Reminder] Failed to cancel scheduled reminders', { reason, error: String(error) });
  }
}

function buildReminderContent(): Notifications.NotificationContentInput {
  return {
    title: DEFAULT_REMINDER_TITLE,
    body: DEFAULT_REMINDER_BODY,
    data: {
      kind: REMINDER_NOTIFICATION_KIND,
      deepLink: REMINDER_DEEP_LINK,
      isTest: false,
    },
    ...(Platform.OS === 'android'
      ? {
          android: {
            channelId: REMINDER_CHANNEL_ID,
          },
        }
      : {}),
  };
}

export async function scheduleNextEligibleReminder(reason: string = 'reschedule'): Promise<void> {
  try {
    await initializeReminderNotifications();
    const state = useSettings.getState();

    if (!state.remindersEnabled) {
      await cancelReminderSchedule('reminders_disabled');
      return;
    }

    const permission = await syncReminderPermissionStatus();
    
    // Request permission if not granted (for Android 13+ and initial setup)
    if (permission !== 'granted') {
      const newPermission = await requestReminderPermission();
      if (newPermission !== 'granted') {
        // Keep reminder state coherent when permission was revoked outside the app.
        state.setRemindersEnabled(false);
        await cancelReminderSchedule('permission_not_granted');
        return;
      }
    }

    const now = new Date();
    const eligibility = computeNextEligibleReminder({
      now,
      preferredTimeLocal: state.reminderPreferredTimeLocal,
      quietHoursStart: state.reminderQuietHoursStart,
      quietHoursEnd: state.reminderQuietHoursEnd,
      lastDeliveredAtUtc: state.reminderLastDeliveredAtUtc,
      lastDeliveredLocalDate: state.reminderLastDeliveredLocalDate,
    });

    // Single-slot scheduling: clear previous future reminders and keep exactly one.
    await cancelReminderSchedule('single_slot_reschedule');

    await Notifications.scheduleNotificationAsync({
      content: buildReminderContent(),
      trigger: eligibility.candidateLocal,
    });

    state.setReminderNextScheduledAtUtc(eligibility.candidateUtc);
    log('[Reminder] Scheduled next eligible reminder', {
      reason,
      candidateLocal: eligibility.candidateLocal.toString(),
      candidateUtc: eligibility.candidateUtc,
      quietHoursAdjusted: eligibility.quietHoursAdjusted,
      minimumSpacingApplied: eligibility.minimumSpacingApplied,
      dailyGateApplied: eligibility.dailyGateApplied,
    });
  } catch (error) {
    logError('[Reminder] Failed to schedule next reminder', { reason, error: String(error) });
  }
}

export async function runReminderRuntimeGateCheck(source: string = 'runtime'): Promise<void> {
  try {
    const state = useSettings.getState();

    if (!state.remindersEnabled) {
      await cancelReminderSchedule(`runtime_${source}_disabled`);
      return;
    }

    const status = await syncReminderPermissionStatus();

    if (status !== 'granted') {
      // Request permission if not granted
      const newPermission = await requestReminderPermission();
      if (newPermission !== 'granted') {
        state.setRemindersEnabled(false);
        await cancelReminderSchedule(`runtime_${source}_permission_denied`);
        return;
      }
    }

    await scheduleNextEligibleReminder(`runtime_${source}`);
  } catch (error) {
    logError('[Reminder] Runtime gate check failed', { source, error: String(error) });
  }
}

export async function setRemindersEnabledAndReschedule(enabled: boolean): Promise<void> {
  const state = useSettings.getState();
  state.setRemindersEnabled(enabled);

  if (!enabled) {
    await cancelReminderSchedule('user_disabled');
    return;
  }

  // First check if we can ask for permissions
  const canAsk = await Notifications.canAskForPermissionsAsync();
  
  if (!canAsk) {
    // Permission already denied
    const status = await syncReminderPermissionStatus();
    state.setRemindersEnabled(false);
    await cancelReminderSchedule('permission_denied_on_enable');
    return;
  }

  const status = await requestReminderPermission();
  if (status !== 'granted') {
    state.setRemindersEnabled(false);
    await cancelReminderSchedule('permission_denied_on_enable');
    return;
  }

  await scheduleNextEligibleReminder('user_enabled');
}

export async function scheduleReminderTestNotification(countAsReal: boolean = false): Promise<void> {
  try {
    await initializeReminderNotifications();
    await ensureReminderChannel();

    // Schedule test notification to fire immediately (3 seconds in the future)
    // Use a Date trigger for better compatibility across platforms
    const triggerAt = new Date(Date.now() + 3000);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: DEFAULT_REMINDER_TITLE,
        body: DEFAULT_REMINDER_BODY,
        data: {
          kind: REMINDER_NOTIFICATION_KIND,
          deepLink: REMINDER_DEEP_LINK,
          isTest: true,
          testCountsAsReal: countAsReal,
        },
        ...(Platform.OS === 'android'
          ? {
              android: {
                channelId: REMINDER_CHANNEL_ID,
              },
            }
          : {}),
      },
      trigger: triggerAt,
    });

    log('[Reminder] Scheduled test notification to fire in 3 seconds');
  } catch (error) {
    logError('[Reminder] Failed to schedule test notification', { error: String(error) });
  }
}

export function extractReminderDeepLink(
  response: Notifications.NotificationResponse
): string | null {
  const data = (response.notification.request.content.data || {}) as ReminderNotificationData;
  if (data.kind !== REMINDER_NOTIFICATION_KIND) {
    return null;
  }
  return typeof data.deepLink === 'string' ? data.deepLink : null;
}
