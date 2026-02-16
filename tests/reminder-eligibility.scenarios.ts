import {
  computeNextEligibleReminder,
  evaluateReminderDeliveryGate,
  formatLocalDate,
} from '../src/lib/services/reminderEligibility';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertTime(date: Date, expectedHours: number, expectedMinutes: number, message: string): void {
  assert(
    date.getHours() === expectedHours && date.getMinutes() === expectedMinutes,
    `${message}. Expected ${expectedHours.toString().padStart(2, '0')}:${expectedMinutes
      .toString()
      .padStart(2, '0')}, got ${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  );
}

function scenarioMaxOnePerLocalDay(): void {
  const now = new Date(2026, 1, 16, 10, 0, 0, 0); // Local: Feb 16, 10:00
  const delivered = new Date(2026, 1, 16, 9, 0, 0, 0); // Same local day

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '20:00',
    lastDeliveredAtUtc: delivered.toISOString(),
    lastDeliveredLocalDate: formatLocalDate(delivered),
  });

  assert(
    result.candidateLocalDate !== formatLocalDate(delivered),
    'Daily gate must prevent a second reminder in the same local calendar day'
  );
}

function scenarioPreferredTimeWinsOverEarlierSpacingCandidate(): void {
  // Product decision locked in implementation:
  // schedule at the later of preferred candidate and spacing minimum.
  const now = new Date(2026, 1, 16, 0, 30, 0, 0); // Local: Feb 16, 00:30
  const deliveredYesterdayLate = new Date(2026, 1, 15, 20, 0, 0, 0);

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '10:00',
    lastDeliveredAtUtc: deliveredYesterdayLate.toISOString(),
    lastDeliveredLocalDate: formatLocalDate(deliveredYesterdayLate),
  });

  assertTime(
    result.candidateLocal,
    10,
    0,
    'Preferred time should win when spacing would allow an earlier time'
  );
}

function scenarioEighteenHundredDeliveryRespectsPreferredNextMorning(): void {
  const now = new Date(2026, 1, 16, 23, 0, 0, 0);
  const delivered = new Date(2026, 1, 16, 18, 0, 0, 0);

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '08:00',
    lastDeliveredAtUtc: delivered.toISOString(),
    lastDeliveredLocalDate: formatLocalDate(delivered),
  });

  assertTime(
    result.candidateLocal,
    8,
    0,
    'When spacing allows 06:00 but preferred is 08:00, candidate should stay at preferred time'
  );
}

function scenarioQuietHoursDefersToAllowedTime(): void {
  const now = new Date(2026, 1, 16, 4, 0, 0, 0);

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '06:30',
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
  });

  assertTime(
    result.candidateLocal,
    7,
    0,
    'Quiet hours crossing midnight should push reminders to quiet-hours end'
  );
}

function scenarioPreferredEightIsAllowedOutsideQuietHours(): void {
  const now = new Date(2026, 1, 16, 5, 0, 0, 0);

  const result = computeNextEligibleReminder({
    now,
    preferredTimeLocal: '08:00',
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
  });

  assertTime(
    result.candidateLocal,
    8,
    0,
    'Preferred time at 08:00 should remain unchanged when outside quiet hours'
  );
}

function scenarioSpacingGateUsesUtcAbsoluteTime(): void {
  const now = new Date(2026, 1, 17, 0, 0, 0, 0);
  const delivered = new Date(now.getTime() - 11 * 60 * 60 * 1000); // 11h ago

  const gate = evaluateReminderDeliveryGate({
    now,
    remindersEnabled: true,
    permissionGranted: true,
    lastDeliveredAtUtc: delivered.toISOString(),
    lastDeliveredLocalDate: '2000-01-01', // Intentionally different local date
  });

  assert(
    gate.allowed === false && gate.reason === 'spacing_not_elapsed',
    'Spacing gate must rely on UTC timestamp and block delivery when <12h'
  );
}

function scenarioToggleOffPrecondition(): void {
  const now = new Date(2026, 1, 16, 12, 0, 0, 0);
  const gate = evaluateReminderDeliveryGate({
    now,
    remindersEnabled: false,
    permissionGranted: true,
  });

  assert(gate.allowed === false && gate.reason === 'disabled', 'Disabled reminders must block delivery');
}

function scenarioTimezoneShiftStillRespectsSpacing(): void {
  // Simulate timezone shift by using a different local date string than "now".
  // Spacing still has to hold via UTC.
  const delivered = new Date(Date.UTC(2026, 1, 16, 12, 0, 0, 0));
  const now = new Date(delivered.getTime() + 12 * 60 * 60 * 1000 - 1);

  const gate = evaluateReminderDeliveryGate({
    now,
    remindersEnabled: true,
    permissionGranted: true,
    lastDeliveredAtUtc: delivered.toISOString(),
    lastDeliveredLocalDate: '2099-12-31',
  });

  assert(
    gate.allowed === false && gate.reason === 'spacing_not_elapsed',
    'Timezone/date changes must not bypass the 12-hour spacing gate'
  );
}

export function runReminderEligibilityScenarios(): void {
  scenarioMaxOnePerLocalDay();
  scenarioPreferredTimeWinsOverEarlierSpacingCandidate();
  scenarioEighteenHundredDeliveryRespectsPreferredNextMorning();
  scenarioQuietHoursDefersToAllowedTime();
  scenarioPreferredEightIsAllowedOutsideQuietHours();
  scenarioSpacingGateUsesUtcAbsoluteTime();
  scenarioToggleOffPrecondition();
  scenarioTimezoneShiftStillRespectsSpacing();
}
