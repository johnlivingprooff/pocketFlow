import { cloudRequest } from './cloudApi';
import { clearCloudTokens, getRefreshToken, storeCloudTokens } from './tokenStorage';
import { useSettings } from '@/store/useStore';
import { CloudAuthResponse } from '@/types/cloud';

type AuthPayload = {
  email: string;
  password: string;
};

type MeResponse = {
  user: {
    id: string;
    email: string;
    accountStatus: 'active';
  };
};

async function persistAuthResponse(response: CloudAuthResponse): Promise<void> {
  await storeCloudTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
  const settings = useSettings.getState();
  settings.setCloudUser(response.user);
  settings.setCloudSessionState('authenticated');
}

export async function createCloudAccount(payload: AuthPayload): Promise<void> {
  useSettings.getState().setCloudSessionState('authenticating');
  try {
    const response = await cloudRequest<CloudAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { auth: false });
    await persistAuthResponse(response);
  } catch (error) {
    useSettings.getState().setCloudSessionState('signed_out');
    throw error;
  }
}

export async function signInCloudAccount(payload: AuthPayload): Promise<void> {
  useSettings.getState().setCloudSessionState('authenticating');
  try {
    const response = await cloudRequest<CloudAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { auth: false });
    await persistAuthResponse(response);
  } catch (error) {
    useSettings.getState().setCloudSessionState('signed_out');
    throw error;
  }
}

export async function hydrateCloudSession(): Promise<void> {
  try {
    const response = await cloudRequest<MeResponse>('/auth/me', { method: 'GET' }, { auth: true, retryOnUnauthorized: true });
    useSettings.getState().setCloudUser(response.user);
    useSettings.getState().setCloudSessionState('authenticated');
  } catch {
    await clearCloudTokens();
    useSettings.getState().clearCloudSession();
  }
}

export async function signOutCloudAccount(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    await cloudRequest<void>(
      '/auth/logout',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      { auth: true, retryOnUnauthorized: false }
    );
  } finally {
    await clearCloudTokens();
    useSettings.getState().clearCloudSession();
  }
}

export async function deleteCloudAccount(): Promise<void> {
  await cloudRequest<void>('/auth/account', { method: 'DELETE' }, { auth: true, retryOnUnauthorized: false });
  await clearCloudTokens();
  useSettings.getState().clearCloudSession();
}
