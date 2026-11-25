import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { log, warn, error as logError } from '@/utils/logger';
import { useSettings, ReminderPermissionStatus } from '@/store/useStore';
import {
  DEFAULT_REMINDER_BODY,
  DEFAULT_REMINDER_TITLE,
  computeNextEligibleReminder,
  evaluateReminderDeliveryGate,
  formatLocalTime,
  isRecentDelivery,
  resolveEffectiveReminderTime,
} from './reminderEligibility';

export const REMINDER_CHANNEL_ID = 'expense-log-reminder';
export const REMINDER_NOTIFICATION_ID = 'daily-expense-reminder';
export const REMINDER_TEST_NOTIFICATION_ID = 'expense-reminder-test';
export const REMINDER_DEEP_LINK = '/transactions/add?type=expense';

// Set up the foreground handler once at module load (not inside a function).
// Test notifications are always shown (the user asked for them explicitly).
// Real reminders are only shown when reminders are enabled — and if reading
// settings throws, we fail CLOSED rather than showing a banner the user turned
// off. NOTE: this handler only affects foreground presentation;
// background/killed notifications are shown by the OS regardless.
// NOTE: trigger:null (used by the test path) fires immediately and cannot
// produce a future daily fire with the app closed, so the daily reminder
// must keep its DAILY trigger. Notifications are identified by their fixed
// IDs rather than `content.data`: `data` becomes an org.json.JSONObject in
// the native payload and is the fragile part of scheduled serialization.
export async function handleForegroundNotification(
  notification: Notifications.Notification
) {
  const identifier = notification?.request?.identifier;
  const isTest = identifier === REMINDER_TEST_NOTIFICATION_ID;
  let show = isTest;
  if (!isTest) {
    try {
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
      show = gate.allowed;
    } catch (err) {
      // Never let the handler time out (the OS discards it after ~3s).
      warn('[Reminder] Foreground handler could not read settings; suppressing banner', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return {
    shouldShowBanner: show,
    shouldShowList: show,
    shouldPlaySound: show,
    shouldSetBadge: false,
  };
}

Notifications.setNotificationHandler({ handleNotification: handleForegroundNotification });

let channelReady: Promise<void> | null = null;

/** Configure the Android channel once per app session, not on every schedule/test. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Expense reminders',
      description: 'Daily reminder to log expenses',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    })
      .then(() => undefined)
      .catch((err: unknown) => {
        channelReady = null; // allow a retry on the next attempt
        throw err;
      });
  }
  return channelReady;
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

const padTime = (value: number) => `${value}`.padStart(2, '0');

/**
 * Resolve the time to actually schedule: learned time (if enabled and enough
 * evidence) -> quiet hours -> 12h spacing -> one-per-local-day gate.
 */
export function getReminderPlan(preferredTimeLocal: string) {
  const state = useSettings.getState();
  const effectiveTimeLocal = resolveEffectiveReminderTime(
    preferredTimeLocal,
    state.reminderAdaptiveEnabled,
    state.reminderAdaptiveTimeLocal
  );
  const next = computeNextEligibleReminder({
    now: new Date(),
    preferredTimeLocal: effectiveTimeLocal,
    quietHoursStart: state.reminderQuietHoursStart,
    quietHoursEnd: state.reminderQuietHoursEnd,
    lastDeliveredAtUtc: state.reminderLastDeliveredAtUtc,
    lastDeliveredLocalDate: state.reminderLastDeliveredLocalDate,
  });
  const hour = next.candidateLocal.getHours();
  const minute = next.candidateLocal.getMinutes();
  return {
    hour,
    minute,
    effectiveTimeLocal,
    scheduledTimeLocal: `${padTime(hour)}:${padTime(minute)}`,
    next,
  };
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

/**
 * Deliberately minimal content: no `data` payload. On Android, `data` is
 * converted into an org.json.JSONObject inside NotificationContent and must
 * be serialized when the alarm is persisted. Keeping it out removes the
 * native JSONObject from the scheduling path entirely.
 */
function buildReminderContent() {
  return {
    title: DEFAULT_REMINDER_TITLE,
    body: DEFAULT_REMINDER_BODY,
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

/** Avoid a full AsyncStorage settings write when the value has not changed. */
function storeNextScheduledAt(iso: string | null): void {
  if (useSettings.getState().reminderNextScheduledAtUtc !== iso) {
    useSettings.getState().setReminderNextScheduledAtUtc(iso);
  }
}

async function persistNextScheduledAt(
  hour: number,
  minute: number,
  triggerForQuery: unknown
): Promise<string | null> {
  try {
    const nextMs = await Notifications.getNextTriggerDateAsync(triggerForQuery as never);
    const iso = typeof nextMs === 'number' ? new Date(nextMs).toISOString() : null;
    storeNextScheduledAt(iso);
    return iso;
  } catch (err) {
    // getNextTriggerDateAsync can reject on some platforms – fall back to local math
    // so the UI never stays stuck on "Not scheduled" after a successful schedule.
    const iso = fallbackNextFireUtc(hour, minute);
    storeNextScheduledAt(iso);
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

export interface ReminderPermissionInfo {
  status: ReminderPermissionStatus;
  canAskAgain: boolean;
}

/** One native permission read, shared by startup checks and the settings UI. */
export async function getReminderPermissionInfo(): Promise<ReminderPermissionInfo> {
  const result = await Notifications.getPermissionsAsync();
  const status = toReminderPermissionStatus(result);
  if (useSettings.getState().reminderPermissionStatus !== status) {
    useSettings.getState().setReminderPermissionStatus(status);
  }
  return { status, canAskAgain: result.canAskAgain };
}

export async function syncReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  return (await getReminderPermissionInfo()).status;
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
  const { hour, minute } = getReminderPlan(preferredTimeLocal);

  try {
    // First attempt: cancel-by-id, schedule, verify.
    try {
      await attemptSchedule(hour, minute);
      if (await verifyScheduled()) {
        await finishScheduleSuccess(hour, minute);
        return;
      }
      warn('[Reminder] Scheduled but OS did not retain it, attempting recovery');
    } catch (firstErr) {
      // Most commonly seen on physical Android devices as a native
      // "org.json.JSONObject" failure from expo-notifications: either our
      // payload tripped native serialization, or (more likely when it
      // "worked before") a corrupt previously-persisted alarm breaks the
      // schedule/verify calls. Fall through to recovery below.
      warn('[Reminder] Initial schedule attempt failed, attempting recovery', {
        error: firstErr instanceof Error ? firstErr.message : String(firstErr),
      });
    }

    // Recovery: cancel only our own alarm (test notifications are immediate,
    // and wiping every scheduled notification would break any future alarms).
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});
    try {
      await attemptSchedule(hour, minute);
    } catch (retryErr) {
      throw withStage('schedule-call', retryErr);
    }
    let retained = false;
    try {
      retained = await verifyScheduled();
    } catch (verifyErr) {
      throw withStage('verify-read', verifyErr);
    }
    if (!retained) {
      throw new Error(
        'verify-read: system did not retain the scheduled reminder. Allow notifications for pocketFlow and try again.'
      );
    }
    await finishScheduleSuccess(hour, minute);
  } catch (err) {
    storeNextScheduledAt(null);
    logError('[Reminder] Failed to schedule daily reminder', {
      preferredTimeLocal,
      hour,
      minute,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Strip anything that is not JSON-representable (undefined, NaN, functions)
 * before handing the payload to the native module. Android builds the
 * request via `new JSONObject(map)`, which throws on such values and
 * surfaces as an `org.json.JSONObject` scheduling failure.
 */
function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Prefix an error with the schedule stage that produced it (schedule-call vs verify-read). */
function withStage(stage: 'schedule-call' | 'verify-read', err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (message.startsWith(`${stage}:`)) return err as Error;
  return new Error(`${stage}: ${message}`);
}

async function attemptSchedule(hour: number, minute: number): Promise<void> {
  const trigger = toJsonSafe(buildDailyTrigger(hour, minute));
  await ensureChannel();
  // Cancel any existing reminder before scheduling a new one.
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_NOTIFICATION_ID,
    content: toJsonSafe(buildReminderContent()),
    trigger,
  });
}

/**
 * Verify the OS actually accepted the alarm – scheduleNotificationAsync can
 * resolve while the alarm is silently dropped (Doze / OEM killers /
 * exact-alarm denial). Returns false instead of a fake "Saved".
 */
async function verifyScheduled(): Promise<boolean> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.some((n) => n.identifier === REMINDER_NOTIFICATION_ID);
}

async function finishScheduleSuccess(hour: number, minute: number): Promise<void> {
  const nextUtc = await persistNextScheduledAt(hour, minute, buildDailyTrigger(hour, minute));
  log('[Reminder] Daily reminder scheduled', { hour, minute, nextUtc });
}

export async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});
  } finally {
    storeNextScheduledAt(null);
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
export async function runReminderRuntimeGateCheck(
  preFetchedStatus?: ReminderPermissionStatus
): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const { remindersEnabled, reminderPreferredTimeLocal } = useSettings.getState();
    if (!remindersEnabled) {
      // Self-heal: a stale alarm may survive a disable that previously failed
      // to cancel (crash / reinstall edge). Keep this check — a skipped native
      // read here would let an unwanted alarm keep firing.
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

    // Startup passes the status it already fetched so we don't query twice.
    const status = preFetchedStatus ?? (await syncReminderPermissionStatus());
    if (status !== 'granted') {
      warn('[Reminder] Runtime check: permission not granted, skipping');
      return;
    }

    const { hour: wantHour, minute: wantMinute } = getReminderPlan(reminderPreferredTimeLocal);

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

    // Only compute/store the next fire when the label is missing; on a normal
    // foreground resume nothing changed and the native read is unnecessary.
    if (!useSettings.getState().reminderNextScheduledAtUtc) {
      await persistNextScheduledAt(wantHour, wantMinute, buildDailyTrigger(wantHour, wantMinute));
    }
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
    identifier: REMINDER_TEST_NOTIFICATION_ID,
    content: buildReminderContent(),
    trigger: null, // immediate – only fires now while the app runs, which is
    // why the daily reminder (which must fire at a future time, possibly
    // with the app closed) keeps its DAILY trigger instead.
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
  effectiveTimeLocal: string | null;
  adaptiveTimeLocal: string | null;
  quietHoursActive: boolean;
  spacingApplied: boolean;
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
    effectiveTimeLocal: state.reminderAdaptiveEnabled && state.reminderAdaptiveTimeLocal
      ? state.reminderAdaptiveTimeLocal
      : state.reminderPreferredTimeLocal,
    adaptiveTimeLocal: state.reminderAdaptiveTimeLocal,
    quietHoursActive: Boolean(state.reminderQuietHoursStart && state.reminderQuietHoursEnd),
    spacingApplied: false,
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
    let plan: ReturnType<typeof getReminderPlan> | null = null;
    try {
      plan = getReminderPlan(state.reminderPreferredTimeLocal);
    } catch {
      plan = null;
    }
    const want = plan ? { hour: plan.hour, minute: plan.minute } : null;
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
      effectiveTimeLocal: plan?.scheduledTimeLocal ?? base.effectiveTimeLocal,
      spacingApplied: plan?.next.minimumSpacingApplied ?? false,
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
    if (notification?.request?.identifier !== REMINDER_NOTIFICATION_ID) return;
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
  if (response.notification.request.identifier !== REMINDER_NOTIFICATION_ID) return null;
  return REMINDER_DEEP_LINK;
}

/** A reminder tap is the strongest signal that the time was a good one. */
export function recordReminderTapFromResponse(
  response: Notifications.NotificationResponse
): void {
  if (response.notification.request.identifier !== REMINDER_NOTIFICATION_ID) return;
  const deliveryUtc = new Date(response.notification.date).toISOString();
  useSettings.getState().recordReminderEngagement(formatLocalTime(new Date()), deliveryUtc);
}

/**
 * Opening the app shortly after a reminder is a weaker signal. Count it at
 * most once per delivery so one notification can't skew the learned time.
 */
export function recordAppOpenEngagement(): void {
  const state = useSettings.getState();
  if (!state.reminderAdaptiveEnabled) return;
  if (!isRecentDelivery(state.reminderLastDeliveredAtUtc)) return;
  if (state.reminderLastEngagedDeliveryUtc === state.reminderLastDeliveredAtUtc) return;
  state.recordReminderEngagement(
    formatLocalTime(new Date()),
    state.reminderLastDeliveredAtUtc
  );
}
