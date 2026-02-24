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
