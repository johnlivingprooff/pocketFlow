export const todayISO = () => new Date().toISOString();

/**
 * Parse a date-only string (YYYY-MM-DD) as a LOCAL calendar date.
 * `new Date('YYYY-MM-DD')` parses as UTC midnight and shows the previous day
 * for users in negative UTC offsets.
 */
export const parseLocalDate = (value: string): Date => {
  const firstPart = value.split('T')[0];
  const [year, month, day] = firstPart.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

/** Convert any stored date (full ISO or date-only) to a full ISO string. */
export const normalizeTransactionDate = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }
  return parseLocalDate(value).toISOString();
};

/** Inclusive ISO bounds covering the whole local month. */
export const monthBoundsIso = (year: number, month: number): { start: string; end: string } => ({
  start: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
  end: new Date(year, month, 0, 23, 59, 59, 999).toISOString(),
});

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString();
};

export const yyyyMmDd = (d = new Date()) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// Short readable date used across forms: e.g. Dec-08, 2025
// Cache results: lists call this per row with repeated dates.
// Same output, avoids repeated Date parse + toLocaleString (ICU) work.
const shortDateCache = new Map<string, string>();
const SHORT_DATE_CACHE_MAX = 500;

export const formatShortDate = (dInput: Date | string = new Date()) => {
  const cacheKey = typeof dInput === 'string' ? dInput : `ts:${dInput.getTime()}`;
  const cached = shortDateCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const d = typeof dInput === 'string'
    ? (/^\d{4}-\d{2}-\d{2}$/.test(dInput) ? parseLocalDate(dInput) : new Date(dInput))
    : dInput;
  const month = d.toLocaleString('default', { month: 'short' });
  const day = `${d.getDate()}`.padStart(2, '0');
  const year = d.getFullYear();
  const result = `${month}-${day}, ${year}`;

  if (shortDateCache.size >= SHORT_DATE_CACHE_MAX) shortDateCache.clear();
  shortDateCache.set(cacheKey, result);
  return result;
};
