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
export const formatShortDate = (dInput: Date | string = new Date()) => {
  const d = typeof dInput === 'string' ? new Date(dInput) : dInput;
  const month = d.toLocaleString('default', { month: 'short' });
  const day = `${d.getDate()}`.padStart(2, '0');
  const year = d.getFullYear();
  return `${month}-${day}, ${year}`;
};
