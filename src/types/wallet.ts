export type WalletType = 'Cash' | 'Credit Card' | 'Bank Account' | 'Mobile Money';

// Bank Account specific fields
export interface BankAccountDetails {
  accountType?: 'Checking' | 'Savings' | 'Current' | 'Other';
  accountNumber?: string;
}

// Mobile Money specific fields
export interface MobileMoneyDetails {
  phoneNumber?: string;
  serviceProvider?: 'AirtelMoney' | 'Mpesa' | 'Mpamba' | 'Other';
}

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
  // Conditional fields
  accountType?: string; // For Bank Account
  accountNumber?: string; // For Bank Account
  phoneNumber?: string; // For Mobile Money
  serviceProvider?: string; // For Mobile Money
}
