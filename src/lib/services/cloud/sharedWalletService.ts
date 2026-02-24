import { cloudRequest } from './cloudApi';
import {
  InvitationResponse,
  SharedWalletMember,
  SharedWalletSummary,
  SharedWalletSyncTransaction,
} from '@/types/cloud';

type EnableSharingInput = {
  name: string;
  walletId?: string;
};

type EnableSharingResponse = {
  wallet: SharedWalletSummary;
};

type WalletMembersResponse = {
  members: SharedWalletMember[];
};

type WalletDetailsResponse = {
  wallet: SharedWalletSummary;
};

export async function listSharedWallets(): Promise<SharedWalletSummary[]> {
  const response = await cloudRequest<{ wallets: SharedWalletSummary[] }>('/wallets/shared', { method: 'GET' });
  return response.wallets;
}

export async function getSharedWalletDetails(walletId: string): Promise<SharedWalletSummary> {
  const response = await cloudRequest<WalletDetailsResponse>(`/wallets/${walletId}`, { method: 'GET' });
  return response.wallet;
}

export async function getSharedWalletMembers(walletId: string): Promise<SharedWalletMember[]> {
  const response = await cloudRequest<WalletMembersResponse>(`/wallets/${walletId}/members`, { method: 'GET' });
  return response.members;
}

export async function enableWalletSharing(input: EnableSharingInput): Promise<SharedWalletSummary> {
  const response = await cloudRequest<EnableSharingResponse>('/wallets/share', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.wallet;
}

export async function disableWalletSharing(walletId: string): Promise<void> {
  await cloudRequest<void>(`/wallets/${walletId}/share/disable`, {
    method: 'PATCH',
  });
}

export async function createWalletInvitation(walletId: string): Promise<InvitationResponse> {
  return cloudRequest<InvitationResponse>(`/wallets/${walletId}/invitations`, {
    method: 'POST',
  });
}

export async function acceptWalletInvitation(token: string): Promise<void> {
  await cloudRequest<void>('/invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function removeWalletMember(walletId: string, memberUserId: string): Promise<void> {
  await cloudRequest<void>(`/wallets/${walletId}/members/${memberUserId}`, {
    method: 'DELETE',
  });
}

export async function syncWalletTransactions(
  walletId: string,
  transactions: SharedWalletSyncTransaction[]
): Promise<void> {
  await cloudRequest<void>(`/wallets/${walletId}/transactions/sync`, {
    method: 'POST',
    body: JSON.stringify({ transactions }),
  });
}
