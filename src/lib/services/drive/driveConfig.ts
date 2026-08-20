import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Google Drive OAuth client IDs, resolved from app.json `extra.googleDrive` or
 * EXPO_PUBLIC_GOOGLE_DRIVE_* environment variables.
 *
 * Required Google Cloud Console setup (one time):
 *  1. Enable the Google Drive API for your project.
 *  2. Create OAuth Client IDs:
 *     - iOS client  -> `iosClientId` (bundle id: com.eiteone.pocketflow)
 *     - Android client -> `androidClientId` (package: com.eiteone.pocketflow)
 *     - Web client  -> `webClientId` (+ optional `webClientSecret`)
 *  3. Authorized redirect URIs for the Web client must include the expo auth
 *     proxy URL used by Expo Go: https://auth.expo.io/@john-livingprooff/pocketflow
 *  4. Android client needs the SHA-1 fingerprint of your signing keystore.
 */
export interface DriveClientIds {
  iosClientId: string | null;
  androidClientId: string | null;
  webClientId: string | null;
  webClientSecret: string | null;
}

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getExtra(): Record<string, unknown> {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
}

const GOOGLE_DRIVE_ENV = {
  EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_SECRET: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_SECRET,
} as const;

function readString(
  envKey: keyof typeof GOOGLE_DRIVE_ENV,
  extraKey: string,
): string | null {
  const fromEnv = GOOGLE_DRIVE_ENV[envKey];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  const extra = getExtra().googleDrive as Record<string, unknown> | undefined;
  const fromExtra = extra?.[extraKey];
  return typeof fromExtra === 'string' && fromExtra.length > 0 ? fromExtra : null;
}

export function getDriveClientIds(): DriveClientIds {
  return {
    iosClientId: readString('EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID', 'iosClientId'),
    androidClientId: readString('EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID', 'androidClientId'),
    webClientId: readString('EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID', 'webClientId'),
    webClientSecret: readString('EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_SECRET', 'webClientSecret'),
  };
}

/**
 * Client ID used on the current platform:
 *  - Native (dev build / standalone): the platform-specific client ID.
 *  - Expo Go / web: falls back to the web client ID.
 */
export function getPlatformDriveClientId(): string | null {
  const ids = getDriveClientIds();
  const native = Platform.OS === 'ios' ? ids.iosClientId : ids.androidClientId;
  return native ?? ids.webClientId;
}

export function isDriveConfigured(): boolean {
  const ids = getDriveClientIds();
  return Boolean(ids.iosClientId || ids.androidClientId || ids.webClientId);
}

/**
 * Human-readable setup guidance shown when configuration is missing.
 */
export function driveSetupHint(): string {
  return (
    'Google Drive is not configured yet.\n\n' +
    'Open the Google Cloud Console, enable the Drive API, and add your OAuth ' +
    'client IDs to app.json under "extra.googleDrive" ' +
    '(iosClientId, androidClientId, webClientId) or set the ' +
    'EXPO_PUBLIC_GOOGLE_DRIVE_* environment variables.'
  );
}