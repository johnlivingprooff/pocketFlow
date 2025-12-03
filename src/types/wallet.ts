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
  exchange_rate?: number; // Rate to convert to default currency (default: 1.0)
    display_order?: number; // Order for displaying wallets (default: 0)
}
