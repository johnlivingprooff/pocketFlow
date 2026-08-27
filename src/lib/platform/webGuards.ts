import { Platform } from 'react-native';

/**
 * Centralised web-only guards for the shared-wallet-only web experience.
 *
 * Requirement: On the web deployment (Vercel) ONLY shared wallets may be
 * viewed/altered. All personal-wallet & app-only features (budgets, goals,
 * analytics, SMS scanning, receipts, biometrics, local backups…) are locked
 * to the native app and must show an "app-only" upsell.
 *
 * Creating or joining a shared wallet requires a cloud account on BOTH
 * platforms, but is enforced as a hard gate on web (no anonymous shared
 * wallets).
 */

export const isWeb = Platform.OS === 'web';

export function isSharedWallet(w: { is_shared?: number | boolean | null; cloud_wallet_id?: string | null }): boolean {
  // local wallets store is_shared as 0/1 integer; cloud wallets track is_shared boolean
  return Boolean(w.is_shared === 1 || w.is_shared === true || w.cloud_wallet_id);
}

export function shouldShowAppOnlyOnWeb(): boolean {
  return isWeb;
}

export const WEB_APP_STORE_URL = 'https://pf.eiteone.org/download';
export const WEB_MARKETING_URL = 'https://pf.eiteone.org';

export function webSharedWalletsOnlyFilter<T extends { is_shared?: number | boolean | null; cloud_wallet_id?: string | null }>(
  wallets: T[]
): T[] {
  if (!isWeb) return wallets;
  return wallets.filter(isSharedWallet);
}
