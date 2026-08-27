export interface CloudAuthResponse {
  user: {
    id: string;
    email: string;
    accountStatus: 'active';
  };
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
}

export interface SharedWalletSummary {
  id: string;
  name: string;
  shareId: string | null;
  role: 'owner' | 'member';
  memberCount: number;
  syncStatus: 'synced' | 'syncing' | 'error';
}

export interface SharedWalletMember {
  userId: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface InvitationResponse {
  invitationId: string;
  token: string;
  inviteLink: string;
  expiresAt: string;
}

export interface SharedWalletSyncTransaction {
  externalId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string | null;
  date: string;
  notes: string | null;
  updatedAt: string;
}

// Cloud profile snapshot: bare-bones user customization (no transactions)
export interface CloudWalletProfile {
  id: number;
  name: string;
  currency: string;
  type: 'Cash' | 'Credit Card' | 'Bank Account' | 'Mobile Money';
  color: string | null;
  description: string | null;
  initialBalance: number;
  balance: number; // last-known balance snapshot (transactions are NOT synced)
  exchangeRate: number;
  displayOrder: number;
  overdraftLimit: number;
  isPrimary: number;
  accountType?: string | null;
  accountNumber?: string | null;
  phoneNumber?: string | null;
  serviceProvider?: string | null;
}

export interface CloudCategoryProfile {
  id: number; // local id at snapshot time (used to re-map parent/child relations)
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string | null;
  color: string | null;
  isPreset: number;
  budget: number | null;
  parentCategoryId: number | null;
}

export interface CloudSettingsProfile {
  name: string;
  themeMode: 'light' | 'dark' | 'system';
  defaultCurrency: string;
  remindersEnabled: boolean;
  reminderPreferredTimeLocal: string;
  reminderQuietHoursStart: string | null;
  reminderQuietHoursEnd: string | null;
  hideBalances: boolean;
  smsScanningEnabled: boolean;
}

export interface CloudProfilePayload {
  wallets: CloudWalletProfile[];
  categories: CloudCategoryProfile[];
  settings: CloudSettingsProfile;
}

export interface CloudProfile extends CloudProfilePayload {
  updatedAt: string;
}
