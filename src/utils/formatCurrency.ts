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
