export const todayISO = () => new Date().toISOString();

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

  const d = typeof dInput === 'string' ? new Date(dInput) : dInput;
  const month = d.toLocaleString('default', { month: 'short' });
  const day = `${d.getDate()}`.padStart(2, '0');
  const year = d.getFullYear();
  const result = `${month}-${day}, ${year}`;

  if (shortDateCache.size >= SHORT_DATE_CACHE_MAX) shortDateCache.clear();
  shortDateCache.set(cacheKey, result);
  return result;
};
