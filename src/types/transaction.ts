export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id?: number;
  wallet_id: number;
  type: TransactionType;
  amount: number;
  category?: string;
  date: string; // ISO string
  notes?: string;
  receipt_uri?: string;
  created_at?: string;
}
