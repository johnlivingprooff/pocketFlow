import { Platform } from 'react-native';
// @ts-ignore - expo-modules-core is available via expo
import { requireNativeModule } from 'expo-modules-core';

import { log, warn, error as logError } from '@/utils/logger';
import { useSettings, ReminderPermissionStatus } from '@/store/useStore';
import {
  computeNextEligibleReminder,
  evaluateReminderDeliveryGate,
  formatLocalDate,
  DEFAULT_REMINDER_BODY,
  DEFAULT_REMINDER_TITLE,
} from './reminderEligibility';

// Safe lazy import of Notifications
let Notifications: any = null;

export async function getNotifications() {
  if (Notifications) return Notifications;
  try {
    // Probe for native module first to avoid noisy load errors
    try {
      requireNativeModule('ExpoPushTokenManager');
    } catch (e) {
      // Native module missing - don't even try to import the JS package
      // as it might contain top-level native requirements
      warn('[Reminder] ExpoPushTokenManager native module not found');
      return null;
    }

    // Dynamic import to avoid crash if native module is missing on load
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch (error) {
    logError('[Reminder] Failed to load expo-notifications module', { error: String(error) });
    return null;
  }
}

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

function toReminderPermissionStatus(permissions: any): ReminderPermissionStatus { // Use any to avoid deep type deps if module missing
  if (!permissions) return 'denied';

  if (permissions.granted) {
    return 'granted';
  }

  // IOS Provisisonal check - safe navigation
  const isProvisional =
    permissions.ios?.status === 3; // 3 is PROVISIONAL key in enum usually, but let's check structure if needed.
  // Actually, let's trust the property access

  // Safe access to imported enum if possible, or just check value
  // Notifications.IosAuthorizationStatus.PROVISIONAL

  if (Notifications && permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }

  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

function getReminderData(notification: any): ReminderNotificationData {
  return (notification.request.content.data || {}) as ReminderNotificationData;
}

function isReminderNotification(notification: any): boolean {
  const data = getReminderData(notification);
  return data.kind === REMINDER_NOTIFICATION_KIND;
}

function reminderBehavior(shouldShowAlert: boolean): any {
  return {
    shouldShowAlert,
    shouldShowBanner: shouldShowAlert,
    shouldShowList: shouldShowAlert,
    shouldPlaySound: shouldShowAlert,
    shouldSetBadge: false,
  };
}

async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const Notifications = await getNotifications();
  if (!Notifications || typeof Notifications.setNotificationChannelAsync !== 'function') {
    warn('[Reminder] Notifications.setNotificationChannelAsync is not available');
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Expense reminders',
    description: 'Daily reminder to log expenses',
    importance: Notifications.AndroidImportance ? Notifications.AndroidImportance.HIGH : 4,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility ? Notifications.AndroidNotificationVisibility.PUBLIC : 1,
    sound: 'default',
  });
}

export async function syncReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  const Notifications = await getNotifications();
  if (!Notifications || typeof Notifications.getPermissionsAsync !== 'function') {
    warn('[Reminder] Notifications.getPermissionsAsync is not available');
    return 'denied';
  }

  const permissions = await Notifications.getPermissionsAsync();
  const status = toReminderPermissionStatus(permissions);
  useSettings.getState().setReminderPermissionStatus(status);
  return status;
}

export async function canAskForReminderPermissionAgain(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications || typeof Notifications.canAskForPermissionsAsync !== 'function') {
    warn('[Reminder] Notifications.canAskForPermissionsAsync is not available');
    return false;
  }

  try {
    return await Notifications.canAskForPermissionsAsync();
  } catch (error) {
    logError('[Reminder] Failed to check canAskForPermissionsAsync', { error: String(error) });
    return false;
  }
}

export async function requestReminderPermission(): Promise<ReminderPermissionStatus> {
  const Notifications = await getNotifications();
  if (!Notifications || typeof Notifications.requestPermissionsAsync !== 'function' || typeof Notifications.canAskForPermissionsAsync !== 'function') {
    warn('[Reminder] Notifications permission methods are not available');
    return 'denied';
  }

  // First check if we can ask for permissions
  const canAsk = await Notifications.canAskForPermissionsAsync();

  if (!canAsk) {
    // Permission already denied, get current status
    const permissions = await Notifications.getPermissionsAsync();
    const status = toReminderPermissionStatus(permissions);
    useSettings.getState().setReminderPermissionStatus(status);
    return status;
  }

  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
    },
  });
  const status = toReminderPermissionStatus(result);
  useSettings.getState().setReminderPermissionStatus(status);
  return status;
}

export async function initializeReminderNotifications(): Promise<void> {
  if (remindersInitialized) {
    return;
  }

  const Notifications = await getNotifications();
  if (!Notifications || typeof Notifications.setNotificationHandler !== 'function') {
    warn('[Reminder] Notifications.setNotificationHandler is not available');
    return;
  }

  await ensureReminderChannel();

  Notifications.setNotificationHandler({
    handleNotification: async (notification: any) => {
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
    const Notifications = await getNotifications();
    if (!Notifications || typeof Notifications.getAllScheduledNotificationsAsync !== 'function' || typeof Notifications.cancelScheduledNotificationAsync !== 'function') {
      warn('[Reminder] Notification scheduling methods are not available');
      return;
    }

    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const reminderNotifications = pending.filter((item: any) => {
      const data = (item.content.data || {}) as ReminderNotificationData;
      return data.kind === REMINDER_NOTIFICATION_KIND && !data.isTest;
    });

    await Promise.all(
      reminderNotifications.map((item: any) =>
        Notifications!.cancelScheduledNotificationAsync(item.identifier)
      )
    );

    useSettings.getState().setReminderNextScheduledAtUtc(null);
    log(`[Reminder] Cancelled ${reminderNotifications.length} scheduled reminder(s): ${reason}`);
  } catch (error) {
    logError('[Reminder] Failed to cancel scheduled reminders', { reason, error: String(error) });
  }
}

async function buildReminderContent(): Promise<any> {
  const Notifications = await getNotifications();
  if (!Notifications) return {}; // fallback

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
          priority: Notifications.AndroidNotificationPriority ? Notifications.AndroidNotificationPriority.HIGH : 2,
          vibrationPattern: [0, 250, 250, 250],
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

    const Notifications = await getNotifications();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
      warn('[Reminder] Notifications.scheduleNotificationAsync is not available');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: await buildReminderContent(),
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

  const Notifications = await getNotifications();
  if (!Notifications || typeof Notifications.canAskForPermissionsAsync !== 'function') {
    warn('[Reminder] Notifications permission methods are not available');
    return;
  }

  // First check if we can ask for permissions
  const canAsk = await Notifications.canAskForPermissionsAsync();

  if (!canAsk) {
    // Cannot ask for permissions - check if we already have permission (e.g., provisional on iOS)
    const currentPermission = await syncReminderPermissionStatus();
    if (currentPermission !== 'granted') {
      // Permission already denied
      state.setRemindersEnabled(false);
      await cancelReminderSchedule('permission_denied_on_enable');
      return;
    }
    // Permission is granted (possibly provisional), proceed to schedule
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

    const Notifications = await getNotifications();
    if (!Notifications) {
      throw new Error('Notifications module missing');
    }

    if (typeof Notifications.scheduleNotificationAsync !== 'function') {
      throw new Error('Notifications.scheduleNotificationAsync is not available');
    }

    // Request permission if not granted
    const permission = await syncReminderPermissionStatus();
    if (permission !== 'granted') {
      const newPermission = await requestReminderPermission();
      if (newPermission !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    }

    // Schedule test notification to fire immediately
    // Use null trigger for immediate notification (most reliable across platforms)
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
              priority: Notifications.AndroidNotificationPriority ? Notifications.AndroidNotificationPriority.HIGH : 2,
              vibrationPattern: [0, 250, 250, 250],
            },
          }
          : {}),
      },
      trigger: null, // null = immediate notification
    });

    log('[Reminder] Test notification sent immediately');
  } catch (error) {
    logError('[Reminder] Failed to schedule test notification', { error: String(error) });
    throw error; // Re-throw so UI can handle it
  }
}

export function extractReminderDeepLink(
  response: any
): string | null {
  const data = (response.notification.request.content.data || {}) as ReminderNotificationData;
  if (data.kind !== REMINDER_NOTIFICATION_KIND) {
    return null;
  }
  return typeof data.deepLink === 'string' ? data.deepLink : null;
}
