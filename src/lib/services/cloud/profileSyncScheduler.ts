import { useSettings } from '@/store/useStore';
import { error as logError } from '@/utils/logger';
import { CloudSettingsProfile } from '@/types/cloud';

const SYNC_DEBOUNCE_MS = 2500;

const SYNCED_SETTINGS_KEYS: Array<keyof CloudSettingsProfile> = [
  'themeMode',
  'defaultCurrency',
  'remindersEnabled',
  'reminderPreferredTimeLocal',
  'reminderQuietHoursStart',
  'reminderQuietHoursEnd',
  'hideBalances',
  'smsScanningEnabled',
];

let pendingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced push of the profile snapshot to the cloud.
 * Only runs while the user is signed in to a cloud account.
 */
export function scheduleProfileSync(): void {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
  }
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    const state = useSettings.getState();
    if (state.cloudSessionState !== 'authenticated' || !state.cloudUser) {
      return;
    }
    // Dynamic import avoids a module cycle (db -> scheduler -> profileService -> db)
    void import('./profileService')
      .then((m) => m.pushProfileToCloud())
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logError('[CloudProfile] scheduled sync failed', { error: message });
      });
  }, SYNC_DEBOUNCE_MS);
}

function settingsChanged(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  for (const key of SYNCED_SETTINGS_KEYS) {
    if (prev[key] !== next[key]) {
      return true;
    }
  }
  const prevUser = prev.userInfo as { name?: string } | undefined;
  const nextUser = next.userInfo as { name?: string } | undefined;
  return prevUser?.name !== nextUser?.name;
}

// Push when the synced subset of settings changes (the rest is device-local).
useSettings.subscribe((state, prevState) => {
  if (
    settingsChanged(
      prevState as unknown as Record<string, unknown>,
      state as unknown as Record<string, unknown>
    )
  ) {
    scheduleProfileSync();
  }
});