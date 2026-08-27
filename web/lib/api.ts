export const CLOUD_BASE =
  process.env.NEXT_PUBLIC_CLOUD_API_BASE_URL ||
  process.env.EXPO_PUBLIC_CLOUD_API_BASE_URL ||
  'https://cloud.pf.eiteone.org';

export type CloudUser = { id: string; email: string; accountStatus: 'active' };
export type SharedWalletSummary = {
  id: string;
  name: string;
  shareId: string | null;
  role: 'owner' | 'member';
  memberCount: number;
  syncStatus: 'synced' | 'syncing' | 'error';
};
export type SharedTx = {
  id: string;
  externalId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: string | number;
  category: string | null;
  date: string;
  notes: string | null;
  updatedAt: string;
  createdBy: string;
  createdByEmail: string;
};

class ApiError extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.status = status;
  }
}

function getTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('pf_access'),
    refreshToken: localStorage.getItem('pf_refresh'),
  };
}

export function setTokens(a: string, r: string) {
  localStorage.setItem('pf_access', a);
  localStorage.setItem('pf_refresh', r);
}
export function clearTokens() {
  localStorage.removeItem('pf_access');
  localStorage.removeItem('pf_refresh');
  localStorage.removeItem('pf_user');
}

export async function api<T>(path: string, init: RequestInit = {}, opts: { auth?: boolean } = {}): Promise<T> {
  const auth = opts.auth ?? true;
  const url = `${CLOUD_BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((init.headers as any) || {}) };
  if (auth) {
    const { accessToken } = getTokens();
    if (!accessToken) throw new ApiError('Not authenticated', 401);
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    let msg = `Request failed ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch {}
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export async function register(email: string, password: string) {
  const r = await api<{ user: CloudUser; accessToken: string; refreshToken: string }>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }, { auth: false });
  setTokens(r.accessToken, r.refreshToken);
  localStorage.setItem('pf_user', JSON.stringify(r.user));
  return r;
}
export async function login(email: string, password: string) {
  const r = await api<{ user: CloudUser; accessToken: string; refreshToken: string }>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, { auth: false });
  setTokens(r.accessToken, r.refreshToken);
  localStorage.setItem('pf_user', JSON.stringify(r.user));
  return r;
}
export async function me() {
  return api<{ user: CloudUser }>('/v1/auth/me', { method: 'GET' });
}
export async function logout() {
  const { refreshToken } = getTokens();
  try {
    await api('/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  } catch {}
  clearTokens();
}

// Wallets
export async function listSharedWallets() {
  const r = await api<{ wallets: SharedWalletSummary[] }>('/v1/wallets/shared');
  return r.wallets;
}
export async function createSharedWallet(name: string) {
  const r = await api<{ wallet: SharedWalletSummary }>('/v1/wallets/share', { method: 'POST', body: JSON.stringify({ name }) });
  return r.wallet;
}
export async function getWallet(id: string) {
  const r = await api<{ wallet: SharedWalletSummary }>(`/v1/wallets/${id}`);
  return r.wallet;
}
export async function listTx(walletId: string, limit = 50, offset = 0) {
  return api<{ transactions: SharedTx[]; total: number }>(`/v1/wallets/${walletId}/transactions?limit=${limit}&offset=${offset}`);
}
export async function syncTx(walletId: string, txs: { externalId: string; type: 'income' | 'expense' | 'transfer'; amount: number; category: string | null; date: string; notes: string | null; updatedAt: string }[]) {
  return api(`/v1/wallets/${walletId}/transactions/sync`, { method: 'POST', body: JSON.stringify({ transactions: txs }) });
}
export async function deleteTx(walletId: string, externalId: string) {
  return api(`/v1/wallets/${walletId}/transactions/${encodeURIComponent(externalId)}`, { method: 'DELETE' });
}
export async function listMembers(walletId: string) {
  return api<{ members: { userId: string; email: string; role: 'owner' | 'member'; joinedAt: string }[] }>(`/v1/wallets/${walletId}/members`);
}
export async function createInvite(walletId: string) {
  return api<{ invitationId: string; token: string; inviteLink: string; expiresAt: string }>(`/v1/wallets/${walletId}/invitations`, { method: 'POST' });
}
export async function acceptInvite(token: string) {
  return api('/v1/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) });
}
