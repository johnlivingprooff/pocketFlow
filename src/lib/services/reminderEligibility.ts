export const MIN_REMINDER_SPACING_HOURS = 12;
export const DEFAULT_REMINDER_TITLE = 'Quick check-in';
export const DEFAULT_REMINDER_BODY = 'Log today\'s spending. It takes 10 seconds.';

export interface ReminderEligibilityInput {
  now: Date;
  preferredTimeLocal: string; // HH:MM
  quietHoursStart?: string | null; // HH:MM
  quietHoursEnd?: string | null; // HH:MM
  lastDeliveredAtUtc?: string | null; // ISO string
  lastDeliveredLocalDate?: string | null; // YYYY-MM-DD
  minimumSpacingHours?: number;
}

export interface ReminderEligibilityResult {
  candidateLocal: Date;
  candidateUtc: string;
  candidateLocalDate: string;
  minimumSpacingApplied: boolean;
  dailyGateApplied: boolean;
  quietHoursAdjusted: boolean;
}

export interface ReminderDeliveryGateInput {
  now: Date;
  remindersEnabled: boolean;
  permissionGranted: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  lastDeliveredAtUtc?: string | null;
  lastDeliveredLocalDate?: string | null;
  minimumSpacingHours?: number;
}

export interface ReminderDeliveryGateResult {
  allowed: boolean;
  reason:
    | 'ok'
    | 'disabled'
    | 'permission_denied'
    | 'same_local_day'
    | 'spacing_not_elapsed'
    | 'inside_quiet_hours';
}

interface ParsedTime {
  hours: number;
  minutes: number;
}

function parseTimeLocal(timeLocal: string): ParsedTime {
  const [hoursText, minutesText] = timeLocal.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time format "${timeLocal}". Expected HH:MM.`);
  }

  return { hours, minutes };
}

function atLocalTime(baseDate: Date, parsedTime: ParsedTime): Date {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    parsedTime.hours,
    parsedTime.minutes,
    0,
    0
  );
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseQuietWindow(
  quietHoursStart?: string | null,
  quietHoursEnd?: string | null
): { start: number; end: number } | null {
  if (!quietHoursStart || !quietHoursEnd) {
    return null;
  }

  const startTime = parseTimeLocal(quietHoursStart);
  const endTime = parseTimeLocal(quietHoursEnd);
  const start = startTime.hours * 60 + startTime.minutes;
  const end = endTime.hours * 60 + endTime.minutes;

  // Treat equal values as disabled to avoid full-day lockout.
  if (start === end) {
    return null;
  }

  return { start, end };
}

export function isInsideQuietHours(
  date: Date,
  quietHoursStart?: string | null,
  quietHoursEnd?: string | null
): boolean {
  const window = parseQuietWindow(quietHoursStart, quietHoursEnd);
  if (!window) {
    return false;
  }

  const value = minutesOfDay(date);

  if (window.start < window.end) {
    return value >= window.start && value < window.end;
  }

  // Cross-midnight case (e.g., 21:00-07:00)
  return value >= window.start || value < window.end;
}

function moveToQuietHoursEnd(
  date: Date,
  quietHoursStart?: string | null,
  quietHoursEnd?: string | null
): { adjustedDate: Date; adjusted: boolean } {
  const window = parseQuietWindow(quietHoursStart, quietHoursEnd);
  if (!window) {
    return { adjustedDate: date, adjusted: false };
  }

  if (!isInsideQuietHours(date, quietHoursStart, quietHoursEnd)) {
    return { adjustedDate: date, adjusted: false };
  }

  const endHours = Math.floor(window.end / 60);
  const endMinutes = window.end % 60;
  const candidate = new Date(date.getTime());

  if (window.start < window.end) {
    // Same-day quiet window
    candidate.setHours(endHours, endMinutes, 0, 0);
    return { adjustedDate: candidate, adjusted: true };
  }

  // Cross-midnight quiet window
  // If we are in the "late" section (>= start), end is on next day.
  if (minutesOfDay(date) >= window.start) {
    const nextDay = addLocalDays(candidate, 1);
    nextDay.setHours(endHours, endMinutes, 0, 0);
    return { adjustedDate: nextDay, adjusted: true };
  }

  // Early-morning section (< end), end is on same day.
  candidate.setHours(endHours, endMinutes, 0, 0);
  return { adjustedDate: candidate, adjusted: true };
}

function parseUtc(isoUtc?: string | null): Date | null {
  if (!isoUtc) return null;
  const parsed = new Date(isoUtc);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function nextPreferredTime(now: Date, preferredTimeLocal: string): Date {
  const preferred = parseTimeLocal(preferredTimeLocal);
  const preferredToday = atLocalTime(now, preferred);

  if (preferredToday.getTime() > now.getTime()) {
    return preferredToday;
  }

  return atLocalTime(addLocalDays(now, 1), preferred);
}

function applySpacingAndQuiet(
  candidateLocal: Date,
  minimumNextLocal: Date | null,
  quietHoursStart?: string | null,
  quietHoursEnd?: string | null
): {
  candidateLocal: Date;
  minimumSpacingApplied: boolean;
  quietHoursAdjusted: boolean;
} {
  let candidate = candidateLocal;
  let minimumSpacingApplied = false;
  let quietHoursAdjusted = false;

  if (minimumNextLocal && candidate.getTime() < minimumNextLocal.getTime()) {
    // Product decision:
    // Keep reminders predictable by respecting preferred time; spacing only moves later.
    // We apply candidate = max(candidate, minNext) rather than replacing with minNext directly.
    candidate = new Date(minimumNextLocal.getTime());
    minimumSpacingApplied = true;
  }

  const quietAdjusted = moveToQuietHoursEnd(candidate, quietHoursStart, quietHoursEnd);
  candidate = quietAdjusted.adjustedDate;
  quietHoursAdjusted = quietAdjusted.adjusted;

  return { candidateLocal: candidate, minimumSpacingApplied, quietHoursAdjusted };
}

export function computeNextEligibleReminder(
  input: ReminderEligibilityInput
): ReminderEligibilityResult {
  const minimumSpacingHours = input.minimumSpacingHours ?? MIN_REMINDER_SPACING_HOURS;
  const minimumSpacingMs = minimumSpacingHours * 60 * 60 * 1000;

  let candidate = nextPreferredTime(input.now, input.preferredTimeLocal);
  let minimumSpacingApplied = false;
  let dailyGateApplied = false;
  let quietHoursAdjusted = false;

  const initialQuiet = moveToQuietHoursEnd(candidate, input.quietHoursStart, input.quietHoursEnd);
  candidate = initialQuiet.adjustedDate;
  quietHoursAdjusted = initialQuiet.adjusted;

  const lastDeliveredAtUtc = parseUtc(input.lastDeliveredAtUtc);
  const minimumNextLocal = lastDeliveredAtUtc
    ? new Date(lastDeliveredAtUtc.getTime() + minimumSpacingMs)
    : null;

  const firstSpacingPass = applySpacingAndQuiet(
    candidate,
    minimumNextLocal,
    input.quietHoursStart,
    input.quietHoursEnd
  );
  candidate = firstSpacingPass.candidateLocal;
  minimumSpacingApplied = minimumSpacingApplied || firstSpacingPass.minimumSpacingApplied;
  quietHoursAdjusted = quietHoursAdjusted || firstSpacingPass.quietHoursAdjusted;

  // Daily gate can push candidate forward; re-apply quiet hours and spacing after each push.
  let iterationSafety = 0;
  while (
    input.lastDeliveredLocalDate &&
    formatLocalDate(candidate) === input.lastDeliveredLocalDate &&
    iterationSafety < 10
  ) {
    dailyGateApplied = true;

    const preferred = parseTimeLocal(input.preferredTimeLocal);
    candidate = atLocalTime(addLocalDays(candidate, 1), preferred);

    const rerun = applySpacingAndQuiet(
      candidate,
      minimumNextLocal,
      input.quietHoursStart,
      input.quietHoursEnd
    );
    candidate = rerun.candidateLocal;
    minimumSpacingApplied = minimumSpacingApplied || rerun.minimumSpacingApplied;
    quietHoursAdjusted = quietHoursAdjusted || rerun.quietHoursAdjusted;

    iterationSafety += 1;
  }

  return {
    candidateLocal: candidate,
    candidateUtc: candidate.toISOString(),
    candidateLocalDate: formatLocalDate(candidate),
    minimumSpacingApplied,
    dailyGateApplied,
    quietHoursAdjusted,
  };
}

export function evaluateReminderDeliveryGate(
  input: ReminderDeliveryGateInput
): ReminderDeliveryGateResult {
  if (!input.remindersEnabled) {
    return { allowed: false, reason: 'disabled' };
  }

  if (!input.permissionGranted) {
    return { allowed: false, reason: 'permission_denied' };
  }

  const now = input.now;
  const currentLocalDate = formatLocalDate(now);

  if (input.lastDeliveredLocalDate && input.lastDeliveredLocalDate === currentLocalDate) {
    return { allowed: false, reason: 'same_local_day' };
  }

  const spacingHours = input.minimumSpacingHours ?? MIN_REMINDER_SPACING_HOURS;
  const spacingMs = spacingHours * 60 * 60 * 1000;
  const lastDeliveredAt = parseUtc(input.lastDeliveredAtUtc);

  if (lastDeliveredAt && now.getTime() < lastDeliveredAt.getTime() + spacingMs) {
    return { allowed: false, reason: 'spacing_not_elapsed' };
  }

  if (isInsideQuietHours(now, input.quietHoursStart, input.quietHoursEnd)) {
    return { allowed: false, reason: 'inside_quiet_hours' };
  }

  return { allowed: true, reason: 'ok' };
}
