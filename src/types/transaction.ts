export type TransactionType = 'income' | 'expense' | 'transfer';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id?: number;
  wallet_id: number;
  type: TransactionType;
  amount: number;
  category?: string;
  date: string; // ISO string
  notes?: string;
  receipt_path?: string;
  created_at?: string;
  is_recurring?: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  recurrence_end_date?: string; // ISO string
  parent_transaction_id?: number; // Links generated instances to the recurring template
}
