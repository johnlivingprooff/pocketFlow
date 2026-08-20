import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { AccessTokenRequest } from 'expo-auth-session';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { DRIVE_SCOPES, getDriveClientIds, getPlatformDriveClientId, driveSetupHint } from './driveConfig';
import {
  clearDriveTokens,
  getDriveTokens,
  getDriveProfile,
  storeDriveTokens,
  DriveProfile,
} from './driveTokenStorage';
import { log, error } from '../../../utils/logger';

export const DRIVE_ERR_NOT_CONFIGURED = 'drive_not_configured';
export const DRIVE_ERR_CANCELLED = 'drive_cancelled';
export const DRIVE_ERR_NOT_SIGNED_IN = 'drive_not_signed_in';
export const DRIVE_ERR_SESSION_EXPIRED = 'drive_session_expired';

export class DriveAuthError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.name = 'DriveAuthError';
    this.code = code;
  }
}

const REDIRECT_PATH = 'oauth2redirect';

// Standalone/dev builds use the `<applicationId>:/oauthredirect` redirect format
// (registered per platform in the Google Cloud Console). In Expo Go the same
// call yields an exp:// URL which the native web browser routes through the
// expo auth proxy automatically.
function makeRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    native: `${Application.applicationId}:/oauthredirect`,
    path: REDIRECT_PATH,
  });
}

async function fetchDriveProfile(accessToken: string): Promise<DriveProfile> {
  const userInfoEndpoint = Google.discovery.userInfoEndpoint;
  if (!userInfoEndpoint) {
    throw new DriveAuthError('drive_auth_error', 'Google user info endpoint unavailable');
  }
  const res = await fetch(userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new DriveAuthError(DRIVE_ERR_SESSION_EXPIRED, 'Could not load Google account info');
  }
  const json = (await res.json()) as Record<string, unknown>;
  const email = typeof json.email === 'string' ? json.email : '';
  const name = typeof json.name === 'string' ? json.name : email || 'Google Account';
  const picture = typeof json.picture === 'string' ? json.picture : null;
  return { email, name, picture };
}

function clientSecretForWeb(): string | null {
  const ids = getDriveClientIds();
  return Platform.OS === 'web' ? ids.webClientSecret : null;
}

/**
 * Signs the user in with their Google account and stores tokens + profile.
 * Works in Expo Go (auth proxy), dev builds, and standalone builds.
 */
export async function signInToDrive(): Promise<DriveProfile> {
  const clientId = getPlatformDriveClientId();
  if (!clientId) {
    throw new DriveAuthError(DRIVE_ERR_NOT_CONFIGURED, driveSetupHint());
  }

  const redirectUri = makeRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: DRIVE_SCOPES,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });
  await request.makeAuthUrlAsync(Google.discovery);

  log('[Drive] Opening Google sign-in', { clientId: clientId.slice(0, 8) });

  const result = await request.promptAsync(Google.discovery);
  if (result.type !== 'success') {
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new DriveAuthError(DRIVE_ERR_CANCELLED, 'Sign-in cancelled');
    }
    if (result.type === 'error' && result.error?.message) {
      throw new DriveAuthError(result.error.code || 'drive_auth_error', result.error.message);
    }
    throw new DriveAuthError('drive_auth_error', 'Google sign-in failed. Please try again.');
  }

  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let issuedAt: number | undefined;
  let expiresIn: number | undefined;

  if (result.authentication?.accessToken) {
    accessToken = result.authentication.accessToken;
    refreshToken = result.authentication.refreshToken ?? null;
    issuedAt = result.authentication.issuedAt;
    expiresIn = result.authentication.expiresIn;
  } else if (result.params.code) {
    // Direct code exchange (standalone builds / configured proxy passthrough).
    const exchange = new AccessTokenRequest({
      clientId,
      redirectUri,
      scopes: DRIVE_SCOPES,
      code: result.params.code,
      clientSecret: clientSecretForWeb() ?? undefined,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    });
    const auth = await exchange.performAsync(Google.discovery);
    accessToken = auth.accessToken;
    refreshToken = auth.refreshToken ?? null;
    issuedAt = auth.issuedAt;
    expiresIn = auth.expiresIn;
  }

  if (!accessToken) {
    throw new DriveAuthError('drive_auth_error', 'Google did not return an access token.');
  }

  const profile = await fetchDriveProfile(accessToken);
  await storeDriveTokens({ accessToken, refreshToken: refreshToken ?? '', issuedAt, expiresIn, profile });
  log('[Drive] Signed in as', { email: profile.email });
  return profile;
}

function isTokenFresh(tokens: NonNullable<Awaited<ReturnType<typeof getDriveTokens>>>): boolean {
  if (!tokens.issuedAt || !tokens.expiresIn) return false;
  const expiresMs = (tokens.issuedAt + tokens.expiresIn - 60) * 1000; // 60s safety margin
  return Date.now() < expiresMs;
}

/**
 * Returns a valid access token, refreshing it when close to expiry.
 * Throws DriveAuthError(DRIVE_ERR_SESSION_EXPIRED) when the session must be re-established.
 */
export async function getDriveAccessToken(): Promise<string> {
  const tokens = await getDriveTokens();
  if (!tokens?.accessToken) {
    throw new DriveAuthError(DRIVE_ERR_NOT_SIGNED_IN, 'Not signed in to Google Drive.');
  }
  if (isTokenFresh(tokens)) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    throw new DriveAuthError(DRIVE_ERR_SESSION_EXPIRED, 'Google session expired. Please sign in again.');
  }

  try {
    const ids = getDriveClientIds();
    const clientId = getPlatformDriveClientId();
    if (!clientId) throw new DriveAuthError(DRIVE_ERR_NOT_CONFIGURED, driveSetupHint());
    const refreshed = await AuthSession.refreshAsync(
      {
        clientId,
        clientSecret:
          clientId === ids.webClientId ? ids.webClientSecret ?? undefined : undefined,
        scopes: DRIVE_SCOPES,
        extraParams: { access_type: 'offline' },
        refreshToken: tokens.refreshToken,
      },
      Google.discovery
    );
    const next: NonNullable<Awaited<ReturnType<typeof getDriveTokens>>> = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      issuedAt: refreshed.issuedAt,
      expiresIn: refreshed.expiresIn,
      profile: tokens.profile,
    };
    await storeDriveTokens(next);
    return refreshed.accessToken;
  } catch (e) {
    error('[Drive] Token refresh failed', { message: e instanceof Error ? e.message : String(e) });
    await clearDriveTokens();
    throw new DriveAuthError(DRIVE_ERR_SESSION_EXPIRED, 'Google session expired. Please sign in again.');
  }
}

/**
 * Revokes the current session (best effort) and clears all stored tokens.
 */
export async function signOutFromDrive(): Promise<void> {
  try {
    const tokens = await getDriveTokens();
    const clientId = getPlatformDriveClientId();
    if (tokens?.accessToken && clientId) {
      await AuthSession.revokeAsync(
        { token: tokens.accessToken, clientId },
        Google.discovery
      );
    }
  } catch (e) {
    log('[Drive] Revoke failed (continuing sign-out)', { message: e instanceof Error ? e.message : String(e) });
  }
  await clearDriveTokens();
}

/**
 * Returns the currently linked account without any network calls.
 */
export async function getLinkedDriveAccount(): Promise<DriveProfile | null> {
  return getDriveProfile();
}

export function isDriveCancelledError(e: unknown): boolean {
  return e instanceof DriveAuthError && e.code === DRIVE_ERR_CANCELLED;
}

export function isDriveSessionExpiredError(e: unknown): boolean {
  return e instanceof DriveAuthError && e.code === DRIVE_ERR_SESSION_EXPIRED;
}