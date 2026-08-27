import { cloudRequest } from './cloudApi';
import { createWallet, getWalletBalances, getWallets } from '@/lib/db/wallets';
import { createCategory, getCategories } from '@/lib/db/categories';
import { exec } from '@/lib/db';
import { useSettings } from '@/store/useStore';
import { useOnboarding } from '@/store/useOnboarding';
import {
  CloudCategoryProfile,
  CloudProfile,
  CloudProfilePayload,
  CloudSettingsProfile,
  CloudWalletProfile,
} from '@/types/cloud';
import { error as logError, log } from '@/utils/logger';

export async function buildProfileSnapshot(): Promise<CloudProfilePayload> {
  const wallets = await getWallets();
  const walletIds = wallets.map((w) => w.id ?? -1);
  const balances = await getWalletBalances(walletIds);

  const walletProfiles: CloudWalletProfile[] = wallets.map((w) => {
    const id = w.id ?? -1;
    return {
      id,
      name: w.name,
      currency: w.currency,
      type: w.type,
      color: w.color ?? null,
      description: w.description ?? null,
      initialBalance: w.initial_balance,
      balance: balances[id] ?? w.initial_balance,
      exchangeRate: w.exchange_rate ?? 1,
      displayOrder: w.display_order ?? 0,
      overdraftLimit: w.overdraft_limit ?? 0,
      isPrimary: w.is_primary ?? 0,
      accountType: w.accountType ?? null,
      accountNumber: w.accountNumber ?? null,
      phoneNumber: w.phoneNumber ?? null,
      serviceProvider: w.serviceProvider ?? null,
    };
  });

  const allCategories = await getCategories();
  const customCategories = allCategories.filter((c) => c.is_preset === 0);
  const categoryProfiles: CloudCategoryProfile[] = customCategories.map((c) => ({
    id: c.id ?? -1,
    name: c.name,
    type: c.type,
    icon: c.icon ?? null,
    color: c.color ?? null,
    isPreset: c.is_preset ?? 0,
    budget: c.budget ?? null,
    parentCategoryId: c.parent_category_id ?? null,
  }));

  const s = useSettings.getState();
  const settings: CloudSettingsProfile = {
    name: s.userInfo?.name ?? '',
    themeMode: s.themeMode,
    defaultCurrency: s.defaultCurrency,
    remindersEnabled: s.remindersEnabled,
    reminderPreferredTimeLocal: s.reminderPreferredTimeLocal,
    reminderQuietHoursStart: s.reminderQuietHoursStart,
    reminderQuietHoursEnd: s.reminderQuietHoursEnd,
    hideBalances: s.hideBalances,
    smsScanningEnabled: s.smsScanningEnabled,
  };

  return { wallets: walletProfiles, categories: categoryProfiles, settings };
}

export async function pushProfileToCloud(): Promise<void> {
  const state = useSettings.getState();
  if (state.cloudSessionState !== 'authenticated' || !state.cloudUser) {
    return;
  }

  try {
    const payload = await buildProfileSnapshot();
    await cloudRequest<{ updatedAt: string }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    log('[CloudProfile] pushed snapshot to cloud', {
      wallets: payload.wallets.length,
      categories: payload.categories.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logError('[CloudProfile] push failed', { error: message });
  }
}

export async function fetchCloudProfile(): Promise<CloudProfile | null> {
  const response = await cloudRequest<{ profile: CloudProfile | null }>('/profile', {
    method: 'GET',
  });
  return response.profile;
}

async function applyProfile(profile: CloudProfile): Promise<void> {
  // A restored setup means onboarding is unnecessary: skip straight to the app.
  useOnboarding.getState().markOnboardingComplete();

  // Wallets: no transactions are restored, so the last-known balance snapshot
  // becomes the wallet's initial balance (balance = initial_balance with no rows).
  for (const w of profile.wallets) {
    await createWallet({
      name: w.name,
      currency: w.currency,
      initial_balance: w.balance,
      type: w.type,
      color: w.color ?? undefined,
      description: w.description ?? undefined,
      exchange_rate: w.exchangeRate,
      display_order: w.displayOrder,
      overdraft_limit: w.overdraftLimit,
      is_primary: w.isPrimary,
      accountType: w.accountType ?? undefined,
      accountNumber: w.accountNumber ?? undefined,
      phoneNumber: w.phoneNumber ?? undefined,
      serviceProvider: w.serviceProvider ?? undefined,
    });
  }

  // Categories: parents first, then children, remapping old local ids.
  const idMap = new Map<number, number>();
  const parents = profile.categories.filter((c) => c.parentCategoryId == null);
  const children = profile.categories.filter((c) => c.parentCategoryId != null);
  for (const c of [...parents, ...children]) {
    const newId = await createCategory({
      name: c.name,
      type: c.type,
      icon: c.icon ?? undefined,
      color: c.color ?? undefined,
      is_preset: c.isPreset,
      budget: c.budget ?? undefined,
      parent_category_id: c.parentCategoryId != null ? (idMap.get(c.parentCategoryId) ?? null) : null,
    });
    idMap.set(c.id, newId);
  }

  const s = useSettings.getState();
  if (profile.settings.name) {
    s.setUserInfo({ name: profile.settings.name });
  }
  s.setThemeMode(profile.settings.themeMode);
  s.setDefaultCurrency(profile.settings.defaultCurrency);
  s.setRemindersEnabled(profile.settings.remindersEnabled);
  s.setReminderPreferredTimeLocal(profile.settings.reminderPreferredTimeLocal);
  s.setReminderQuietHours(profile.settings.reminderQuietHoursStart, profile.settings.reminderQuietHoursEnd);
  s.setHideBalances(profile.settings.hideBalances);
  s.setSmsScanningEnabled(profile.settings.smsScanningEnabled);
}

/**
 * Restore the cloud profile when the local database is empty (fresh install).
 * No-op when local data already exists, when not signed in, or when the
 * cloud has no profile yet.
 */
export async function restoreProfileIfFreshInstall(): Promise<{
  restored: boolean;
  wallets: number;
  categories: number;
}> {
  const state = useSettings.getState();
  if (state.cloudSessionState !== 'authenticated' || !state.cloudUser) {
    return { restored: false, wallets: 0, categories: 0 };
  }

  const count = await exec<{ count: number }>('SELECT COUNT(*) as count FROM wallets;');
  if ((count[0]?.count ?? 0) > 0) {
    return { restored: false, wallets: 0, categories: 0 };
  }

  let profile: CloudProfile | null = null;
  try {
    profile = await fetchCloudProfile();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logError('[CloudProfile] fetch failed during restore', { error: message });
    return { restored: false, wallets: 0, categories: 0 };
  }

  if (!profile || profile.wallets.length === 0) {
    return { restored: false, wallets: 0, categories: 0 };
  }

  await applyProfile(profile);
  log('[CloudProfile] restored setup from cloud', {
    wallets: profile.wallets.length,
    categories: profile.categories.length,
  });
  return { restored: true, wallets: profile.wallets.length, categories: profile.categories.length };
}