export type WalletType = 'Cash' | 'Mobile Money' | 'Bank';

export interface Wallet {
  id?: number;
  name: string;
  currency: string;
  initial_balance: number;
  type: WalletType;
  color?: string;
  created_at?: string;
  is_primary?: number; // 0/1
  description?: string;
}
