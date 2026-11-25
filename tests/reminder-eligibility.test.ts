import {
  ADAPTIVE_MIN_SAMPLES,
  computeAdaptiveTimeLocal,
  computeNextEligibleReminder,
  evaluateReminderDeliveryGate,
  formatLocalDate,
  isInsideQuietHours,
  isRecentDelivery,
  resolveEffectiveReminderTime,
} from '../src/lib/services/reminderEligibility';

const pad = (value: number) => `${value}`.padStart(2, '0');
const localTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

test('one reminder per local day: same-day delivery pushes candidate to tomorrow', () => {
  const now = new Date(2026, 1, 16, 10, 0, 0, 0);
  const delivered = new Date(2026, 1, 16, 9, 0, 0, 0);

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '20:00',
    lastDeliveredAtUtc: delivered.toISOString(),
    lastDeliveredLocalDate: formatLocalDate(delivered),
  });

  expect(result.candidateLocalDate).not.toBe(formatLocalDate(delivered));
  expect(result.dailyGateApplied).toBe(true);
});

test('12-hour spacing is measured in absolute UTC time, not local date', () => {
  const delivered = new Date(2026, 1, 15, 20, 0, 0, 0);
  const now = new Date(2026, 1, 16, 0, 30, 0, 0);

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '06:00',
    lastDeliveredAtUtc: delivered.toISOString(),
    lastDeliveredLocalDate: '2000-01-01', // intentionally unrelated local date
  });

  expect(result.minimumSpacingApplied).toBe(true);
  expect(result.candidateLocal.getTime()).toBeGreaterThanOrEqual(
    delivered.getTime() + 12 * 60 * 60 * 1000
  );
});

test('quiet hours crossing midnight defer a candidate inside the window to its end', () => {
  const now = new Date(2026, 1, 16, 4, 0, 0, 0);

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '06:30',
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
  });

  expect(localTime(result.candidateLocal)).toBe('07:00');
  expect(result.quietHoursAdjusted).toBe(true);
  expect(isInsideQuietHours(result.candidateLocal, '21:00', '07:00')).toBe(false);
});

test('preferred time outside quiet hours is unchanged', () => {
  const now = new Date(2026, 1, 16, 5, 0, 0, 0);
  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '08:00',
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
  });
  expect(localTime(result.candidateLocal)).toBe('08:00');
  expect(result.quietHoursAdjusted).toBe(false);
});

test('delivery gate blocks disabled, too-recent, and quiet-hours deliveries', () => {
  const now = new Date(2026, 1, 16, 23, 0, 0, 0);
  const delivered = new Date(2026, 1, 16, 18, 0, 0, 0);

  expect(
    evaluateReminderDeliveryGate({
      now,
      remindersEnabled: false,
      permissionGranted: true,
    }).reason
  ).toBe('disabled');

  expect(
    evaluateReminderDeliveryGate({
      now,
      remindersEnabled: true,
      permissionGranted: true,
      lastDeliveredAtUtc: delivered.toISOString(),
      lastDeliveredLocalDate: '2000-01-01',
    }).reason
  ).toBe('spacing_not_elapsed');

  expect(
    evaluateReminderDeliveryGate({
      now,
      remindersEnabled: true,
      permissionGranted: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '07:00',
    }).reason
  ).toBe('inside_quiet_hours');
});

test('adaptive time needs enough samples and uses the median', () => {
  expect(computeAdaptiveTimeLocal(['08:00', '09:00'])).toBeNull();
  expect(computeAdaptiveTimeLocal(['08:00', '09:00', '10:00'])).toBe('09:00');
  expect(computeAdaptiveTimeLocal(['08:00', '09:00', '10:00', '23:00'])).toBe('09:30');
  expect(ADAPTIVE_MIN_SAMPLES).toBe(3);
});

test('adaptive time overrides preference only when enabled and available', () => {
  expect(resolveEffectiveReminderTime('20:00', true, '09:15')).toBe('09:15');
  expect(resolveEffectiveReminderTime('20:00', false, '09:15')).toBe('20:00');
  expect(resolveEffectiveReminderTime('20:00', true, null)).toBe('20:00');
});

test('app-open engagement counts only within the recent window', () => {
  const delivered = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  expect(isRecentDelivery(delivered)).toBe(true);
  expect(isRecentDelivery(new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString())).toBe(false);
  expect(isRecentDelivery(null)).toBe(false);
});
