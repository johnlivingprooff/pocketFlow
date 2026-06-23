import { cloudRequest } from './cloudApi';
import { clearCloudTokens, getRefreshToken, storeCloudTokens, storeCredentials, clearCredentials, getCredentials } from './tokenStorage';
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

async function persistAuthResponseWithCredentials(response: CloudAuthResponse, credentials: AuthPayload): Promise<void> {
  await persistAuthResponse(response);
  await storeCredentials(credentials);
}

export async function autoLoginWithStoredCredentials(): Promise<boolean> {
  const credentials = await getCredentials();
  if (!credentials) return false;

  try {
    const response = await cloudRequest<CloudAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, { auth: false });
    await persistAuthResponse(response);
    return true;
  } catch {
    return false;
  }
}

export async function createCloudAccount(payload: AuthPayload): Promise<void> {
  useSettings.getState().setCloudSessionState('authenticating');
  try {
    const response = await cloudRequest<CloudAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { auth: false });
    await persistAuthResponseWithCredentials(response, payload);
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
    await persistAuthResponseWithCredentials(response, payload);
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
    const relogged = await autoLoginWithStoredCredentials();
    if (!relogged) {
      await clearCloudTokens();
      useSettings.getState().clearCloudSession();
    }
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
    await clearCredentials();
    useSettings.getState().clearCloudSession();
  }
}

export async function deleteCloudAccount(): Promise<void> {
  await cloudRequest<void>('/auth/account', { method: 'DELETE' }, { auth: true, retryOnUnauthorized: false });
  await clearCloudTokens();
  await clearCredentials();
  useSettings.getState().clearCloudSession();
}
