import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'drive_access_token';
const REFRESH_TOKEN_KEY = 'drive_refresh_token';
const PROFILE_KEY = 'drive_user_profile';
const FOLDER_ID_KEY = 'drive_backup_folder_id';
const PASSPHRASE_KEY = 'drive_backup_passphrase';

export interface DriveProfile {
  email: string;
  name: string;
  picture: string | null;
}

export interface DriveTokens {
  accessToken: string;
  refreshToken: string;
  issuedAt?: number; // epoch seconds
  expiresIn?: number; // seconds
  profile?: DriveProfile | null;
}

let memoryTokens: DriveTokens | null = null;
let memoryFolderId: string | null = null;

async function setWebItem(key: string, value: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`pocketflow_${key}`, value);
}

async function getWebItem(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(`pocketflow_${key}`);
}

async function deleteWebItem(key: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(`pocketflow_${key}`);
}

export async function storeDriveTokens(tokens: DriveTokens): Promise<void> {
  memoryTokens = tokens;
  const profileJson = tokens.profile ? JSON.stringify(tokens.profile) : '';
  if (Platform.OS === 'web') {
    await setWebItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    await setWebItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    await setWebItem(PROFILE_KEY, profileJson);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (profileJson) {
    await SecureStore.setItemAsync(PROFILE_KEY, profileJson);
  } else {
    await SecureStore.deleteItemAsync(PROFILE_KEY);
  }
}

export async function getDriveTokens(): Promise<DriveTokens | null> {
  if (memoryTokens && memoryTokens.accessToken) {
    return memoryTokens;
  }
  if (Platform.OS === 'web') {
    const accessToken = await getWebItem(ACCESS_TOKEN_KEY);
    const refreshToken = await getWebItem(REFRESH_TOKEN_KEY);
    if (!accessToken || !refreshToken) return null;
    memoryTokens = { accessToken, refreshToken };
    return memoryTokens;
  }
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  const profileRaw = await SecureStore.getItemAsync(PROFILE_KEY);
  let profile: DriveProfile | null = null;
  if (profileRaw) {
    try {
      profile = JSON.parse(profileRaw) as DriveProfile;
    } catch {
      profile = null;
    }
  }
  memoryTokens = { accessToken, refreshToken, profile };
  return memoryTokens;
}

export async function getDriveProfile(): Promise<DriveProfile | null> {
  const tokens = await getDriveTokens();
  return tokens?.profile ?? null;
}

export async function clearDriveTokens(): Promise<void> {
  memoryTokens = null;
  if (Platform.OS === 'web') {
    await deleteWebItem(ACCESS_TOKEN_KEY);
    await deleteWebItem(REFRESH_TOKEN_KEY);
    await deleteWebItem(PROFILE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(PROFILE_KEY);
}

export async function getDriveBackupFolderId(): Promise<string | null> {
  if (memoryFolderId) return memoryFolderId;
  if (Platform.OS === 'web') return getWebItem(FOLDER_ID_KEY);
  return SecureStore.getItemAsync(FOLDER_ID_KEY);
}

export async function setDriveBackupFolderId(folderId: string): Promise<void> {
  memoryFolderId = folderId;
  if (Platform.OS === 'web') {
    await setWebItem(FOLDER_ID_KEY, folderId);
    return;
  }
  await SecureStore.setItemAsync(FOLDER_ID_KEY, folderId);
}

export async function clearDriveBackupFolderId(): Promise<void> {
  memoryFolderId = null;
  if (Platform.OS === 'web') {
    await deleteWebItem(FOLDER_ID_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(FOLDER_ID_KEY);
}

export async function getDrivePassphrase(): Promise<string | null> {
  if (Platform.OS === 'web') return getWebItem(PASSPHRASE_KEY);
  return SecureStore.getItemAsync(PASSPHRASE_KEY);
}

export async function setDrivePassphrase(passphrase: string): Promise<void> {
  if (Platform.OS === 'web') {
    await setWebItem(PASSPHRASE_KEY, passphrase);
    return;
  }
  await SecureStore.setItemAsync(PASSPHRASE_KEY, passphrase);
}

export async function clearDrivePassphrase(): Promise<void> {
  if (Platform.OS === 'web') {
    await deleteWebItem(PASSPHRASE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PASSPHRASE_KEY);
}