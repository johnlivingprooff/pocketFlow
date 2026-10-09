import type { Transaction } from '../types/transaction';

// Precompiled once: previously each list row ran notes.match(/to …/i) with a
// freshly compiled regex (3 duplicated copies across components).
const TRANSFER_TO_RE = /to ([^(]+)/i;
const TRANSFER_FROM_RE = /from ([^(]+)/i;

export function getTransferLabel(item: Pick<Transaction, 'type' | 'category' | 'notes'>): string {
  if (item.category !== 'Transfer') return item.category || 'Uncategorized';

  const notes = item.notes || '';
  if (item.type === 'expense') {
    const match = TRANSFER_TO_RE.exec(notes);
    if (match?.[1]) return `Transfer to ${match[1].trim()}`;
    return 'Transfer to wallet';
  }
  if (item.type === 'income') {
    const match = TRANSFER_FROM_RE.exec(notes);
    if (match?.[1]) return `Transfer from ${match[1].trim()}`;
    return 'Transfer from wallet';
  }
  return 'Transfer';
}
