import Constants from 'expo-constants';
import { clearCloudTokens, getCloudTokens, getRefreshToken, storeCloudTokens } from './tokenStorage';
import { useSettings } from '@/store/useStore';
import { CloudAuthResponse } from '@/types/cloud';

type RequestOptions = {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

export class CloudApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CloudApiError';
    this.status = status;
  }
}

function resolveCloudApiBaseUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { cloudApiBaseUrl?: string } | undefined)?.cloudApiBaseUrl;
  const fromEnv = process.env.EXPO_PUBLIC_CLOUD_API_BASE_URL;
  const baseUrl = fromExtra || fromEnv;

  if (!baseUrl) {
    throw new Error('Cloud API base URL is not configured. Set expo.extra.cloudApiBaseUrl or EXPO_PUBLIC_CLOUD_API_BASE_URL.');
  }

  return baseUrl.replace(/\/$/, '');
}

async function parseJsonSafely(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${resolveCloudApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearCloudTokens();
      useSettings.getState().clearCloudSession();
      return false;
    }

    const data = (await response.json()) as CloudAuthResponse;
    await storeCloudTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    useSettings.getState().setCloudUser(data.user);
    useSettings.getState().setCloudSessionState('authenticated');
    return true;
  } catch {
    await clearCloudTokens();
    useSettings.getState().clearCloudSession();
    return false;
  }
}

export async function cloudRequest<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {}
): Promise<T> {
  const auth = options.auth ?? true;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const url = `${resolveCloudApiBaseUrl()}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const tokens = await getCloudTokens();
    if (!tokens?.accessToken) {
      throw new CloudApiError('Not authenticated', 401);
    }
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return cloudRequest<T>(path, init, { ...options, retryOnUnauthorized: false });
    }
  }

  if (!response.ok) {
    const payload = await parseJsonSafely(response);
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new CloudApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
