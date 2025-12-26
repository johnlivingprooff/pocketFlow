export const formatCurrency = (amount: number | undefined, currency = 'USD') => {
  // Handle undefined or null amounts
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const formatLargeNumber = (amount: number | undefined) => {
  // Handle undefined or null amounts
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  // For very large numbers, use exponential notation
  if (Math.abs(amount) >= 1000000) {
    return amount.toExponential(2);
  }

  // For smaller numbers, use regular formatting with max 2 decimal places
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
};
