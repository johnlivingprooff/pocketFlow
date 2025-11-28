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
