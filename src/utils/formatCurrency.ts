import { useSettings } from '@/store/useStore';

// Cache Intl.NumberFormat instances per currency — constructing one per row
// is expensive (ICU data lookup). Same output, ~10-50x faster in lists.
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
const plainFormatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat | null {
  try {
    let formatter = currencyFormatterCache.get(currency);
    if (!formatter) {
      formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      });
      // Bound cache size to avoid unbounded growth from bad input
      if (currencyFormatterCache.size > 50) currencyFormatterCache.clear();
      currencyFormatterCache.set(currency, formatter);
    }
    return formatter;
  } catch {
    return null;
  }
}

function getPlainFormatter(maximumFractionDigits: number, minimumFractionDigits: number): Intl.NumberFormat {
  const key = `${maximumFractionDigits}:${minimumFractionDigits}`;
  let formatter = plainFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      maximumFractionDigits,
      minimumFractionDigits,
    });
    plainFormatterCache.set(key, formatter);
  }
  return formatter;
}

export const formatCurrency = (amount: number | undefined, currency = 'USD') => {
  const { hideBalances } = useSettings.getState();
  if (hideBalances) return '******';

  // Handle undefined or null amounts
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  try {
    const formatter = getCurrencyFormatter(currency);
    if (formatter) return formatter.format(amount);
    return `${currency} ${amount.toFixed(2)}`;
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const formatLargeNumber = (amount: number | undefined) => {
  const { hideBalances } = useSettings.getState();
  if (hideBalances) return '***';

  // Handle undefined or null amounts
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  // For very large numbers, use exponential notation
  if (Math.abs(amount) >= 1000000) {
    return amount.toExponential(2);
  }

  // For smaller numbers, use regular formatting with max 2 decimal places
  return getPlainFormatter(2, 0).format(amount);
};
