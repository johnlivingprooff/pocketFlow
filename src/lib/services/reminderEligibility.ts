export const DEFAULT_REMINDER_TITLE = 'Quick check-in';
export const DEFAULT_REMINDER_BODY = "Log today's spending.";

function parseMinutesOfDay(timeLocal: string): number {
  const [h, m] = timeLocal.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isInsideQuietHours(
  date: Date,
  quietHoursStart?: string | null,
  quietHoursEnd?: string | null
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const start = parseMinutesOfDay(quietHoursStart);
  const end = parseMinutesOfDay(quietHoursEnd);
  if (start === end) return false;

  const now = minutesOfDay(date);
  // Cross-midnight window (e.g. 22:00–07:00)
  if (start > end) return now >= start || now < end;
  return now >= start && now < end;
}
