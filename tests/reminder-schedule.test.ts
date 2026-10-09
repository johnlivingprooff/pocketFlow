/**
 * Verifies the reminder auto-trigger fix:
 * - parsePreferredTime validates HH:MM and rejects out-of-range values
 * - buildDailyTrigger stays in sync for schedule + verify
 * - scheduleReminder persists nextScheduledAtUtc and throws when OS drops it
 * - runReminderRuntimeGateCheck reschedules on time mismatch (not just missing)
 */
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'daily-expense-reminder'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getNextTriggerDateAsync: jest.fn(async () => Date.now() + 3600_000),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
  },
}));

jest.mock('@/utils/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import * as Notifications from 'expo-notifications';
import {
  buildDailyTrigger,
  getReminderDiagnostics,
  parsePreferredTime,
  runReminderRuntimeGateCheck,
  scheduleReminder,
} from '../src/lib/services/reminderNotificationService';
import { useSettings } from '../src/store/useStore';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({
    remindersEnabled: true,
    reminderPreferredTimeLocal: '20:00',
    reminderQuietHoursStart: null,
    reminderQuietHoursEnd: null,
    reminderNextScheduledAtUtc: null,
    reminderLastDeliveredAtUtc: null,
    reminderLastDeliveredLocalDate: null,
    reminderPermissionStatus: 'granted',
  });
});

test('parsePreferredTime accepts valid HH:MM', () => {
  expect(parsePreferredTime('20:00')).toEqual({ hour: 20, minute: 0 });
  expect(parsePreferredTime('08:30')).toEqual({ hour: 8, minute: 30 });
});

test('parsePreferredTime rejects out-of-range values instead of silently scheduling wrong time', () => {
  expect(() => parsePreferredTime('24:00')).toThrow(/Invalid reminder time/);
  expect(() => parsePreferredTime('12:60')).toThrow(/Invalid reminder time/);
  // Corrupt/legacy values fall back to 20:00 rather than crashing foreground checks
  expect(parsePreferredTime('not-a-time')).toEqual({ hour: 20, minute: 0 });
});

test('buildDailyTrigger includes channelId on Android so schedule+verify match', () => {
  const trigger = buildDailyTrigger(20, 30) as Record<string, unknown>;
  expect(trigger.type).toBe('daily');
  expect(trigger.hour).toBe(20);
  expect(trigger.minute).toBe(30);
  expect(trigger.channelId).toBe('expense-log-reminder');
});

test('scheduleReminder persists nextScheduledAtUtc on success', async () => {
  mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
    { identifier: 'daily-expense-reminder', trigger: { type: 'daily', hour: 20, minute: 0 } },
  ]);
  await scheduleReminder('20:00');
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  const arg = mocked.scheduleNotificationAsync.mock.calls[0][0] as Record<string, unknown>;
  expect(arg.identifier).toBe('daily-expense-reminder');
  expect(useSettings.getState().reminderNextScheduledAtUtc).not.toBeNull();
});

test('scheduleReminder throws (instead of fake success) when OS drops the alarm', async () => {
  mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([]);
  await expect(scheduleReminder('20:00')).rejects.toThrow(/did not retain/);
  expect(useSettings.getState().reminderNextScheduledAtUtc).toBeNull();
});

test('runtime gate check reschedules when scheduled time drifted from preference', async () => {
  useSettings.setState({ reminderPreferredTimeLocal: '21:00' });
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
    { identifier: 'daily-expense-reminder', trigger: { type: 'daily', hour: 20, minute: 0 } },
  ]);
  // second call is the post-reschedule verification
  mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
    { identifier: 'daily-expense-reminder', trigger: { type: 'daily', hour: 20, minute: 0 } },
  ]).mockResolvedValueOnce([
    { identifier: 'daily-expense-reminder', trigger: { type: 'daily', hour: 21, minute: 0 } },
  ]);
  await runReminderRuntimeGateCheck();
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  const arg = mocked.scheduleNotificationAsync.mock.calls[0][0] as {
    trigger: { hour: number; minute: number };
  };
  expect(arg.trigger.hour).toBe(21);
  expect(arg.trigger.minute).toBe(0);
});

test('diagnostics reports time_mismatch instead of looking fine', async () => {
  useSettings.setState({ reminderPreferredTimeLocal: '21:00' });
  mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
    { identifier: 'daily-expense-reminder', trigger: { type: 'daily', hour: 20, minute: 0 } },
  ]);
  const diag = await getReminderDiagnostics();
  expect(diag.scheduledExists).toBe(true);
  expect(diag.verdict).toBe('time_mismatch');
});
