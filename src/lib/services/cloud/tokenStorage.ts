import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'cloud_access_token';
const REFRESH_TOKEN_KEY = 'cloud_refresh_token';
const CREDENTIALS_KEY = 'cloud_credentials';

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export interface StoredCloudTokens {
  accessToken: string;
  refreshToken: string;
}

async function setWebItem(key: string, value: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

async function getWebItem(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

async function deleteWebItem(key: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
}

// Passwords must not be persisted across browser sessions in localStorage.
// sessionStorage survives reloads but is cleared when the tab closes.
async function setSessionItem(key: string, value: string): Promise<void> {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(key, value);
}

async function getSessionItem(key: string): Promise<string | null> {
  if (typeof sessionStorage === 'undefined') return null;
  const current = sessionStorage.getItem(key);
  if (current) return current;
  // Migrate any value written by older builds and stop persisting it.
  if (typeof localStorage === 'undefined') return null;
  const legacy = localStorage.getItem(key);
  if (legacy) {
    localStorage.removeItem(key);
    sessionStorage.setItem(key, legacy);
  }
  return legacy;
}

async function deleteSessionItem(key: string): Promise<void> {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
  await deleteWebItem(key);
}

export async function storeCloudTokens(tokens: StoredCloudTokens): Promise<void> {
  memoryAccessToken = tokens.accessToken;
  memoryRefreshToken = tokens.refreshToken;

  if (Platform.OS === 'web') {
    await setWebItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    await setWebItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function getCloudTokens(): Promise<StoredCloudTokens | null> {
  if (memoryAccessToken && memoryRefreshToken) {
    return { accessToken: memoryAccessToken, refreshToken: memoryRefreshToken };
  }

  if (Platform.OS === 'web') {
    const accessToken = await getWebItem(ACCESS_TOKEN_KEY);
    const refreshToken = await getWebItem(REFRESH_TOKEN_KEY);
    if (!accessToken || !refreshToken) return null;
    memoryAccessToken = accessToken;
    memoryRefreshToken = refreshToken;
    return { accessToken, refreshToken };
  }

  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;

  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
  return { accessToken, refreshToken };
}

export async function clearCloudTokens(): Promise<void> {
  memoryAccessToken = null;
  memoryRefreshToken = null;

  if (Platform.OS === 'web') {
    await deleteWebItem(ACCESS_TOKEN_KEY);
    await deleteWebItem(REFRESH_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getCloudTokens();
  return tokens?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const tokens = await getCloudTokens();
  return tokens?.refreshToken ?? null;
}

export interface StoredCredentials {
  email: string;
  password: string;
}

export async function storeCredentials(credentials: StoredCredentials): Promise<void> {
  if (Platform.OS === 'web') {
    await setSessionItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    return;
  }
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function getCredentials(): Promise<StoredCredentials | null> {
  if (Platform.OS === 'web') {
    const raw = await getSessionItem(CREDENTIALS_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearCredentials(): Promise<void> {
  if (Platform.OS === 'web') {
    await deleteSessionItem(CREDENTIALS_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}
