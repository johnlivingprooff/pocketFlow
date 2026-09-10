import { Platform } from 'react-native';
import { exec, execRun, getDbAsync } from '@/lib/db';
import { useSettings } from '@/store/useStore';
import { error as logError, log } from '@/utils/logger';
import { invalidateTransactionCaches } from '@/lib/cache/queryCache';
import { refreshDerivedFinanceStateForWallets } from '@/lib/db/derivedState';
import {
  listSharedWalletTransactions,
  syncWalletTransactions,
  SharedTransactionRow,
} from './sharedWalletService';

const SYNC_DEBOUNCE_MS = 1500;
const PULL_LIMIT = 100;

const debounceMap = new Map<number, ReturnType<typeof setTimeout>>();
const ongoingSync = new Set<number>();

function isSyncEligible(): boolean {
  if (Platform.OS === 'web') return false;
  const s = useSettings.getState();
  return s.cloudSessionState === 'authenticated' && !!s.cloudUser;
}

export function scheduleSharedSync(walletId: number): void {
  if (!isSyncEligible()) return;
  const existing = debounceMap.get(walletId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    debounceMap.delete(walletId);
    void syncSharedWallet(walletId);
  }, SYNC_DEBOUNCE_MS);
  debounceMap.set(walletId, t);
}

export function scheduleSyncForAllSharedWallets(): void {
  if (!isSyncEligible()) return;
  void syncAllSharedWallets();
}

export async function syncAllSharedWallets(): Promise<void> {
  if (!isSyncEligible()) return;
  try {
    const wallets: any[] = await exec('SELECT id, cloud_wallet_id FROM wallets WHERE is_shared = 1 AND cloud_wallet_id IS NOT NULL;');
    await Promise.all(wallets.map((w) => syncSharedWallet(w.id)));
  } catch (e) {
    logError('[Sync] syncAll failed', e as any);
  }
}

async function getLastSyncAt(walletId: number): Promise<string | null> {
  try {
    const rows: any[] = await exec('SELECT last_sync_at FROM cloud_sync_meta WHERE wallet_id = ?;', [walletId]);
    return rows[0]?.last_sync_at ?? null;
  } catch {
    return null;
  }
}

async function setLastSyncAt(walletId: number, iso: string): Promise<void> {
  try {
    await execRun(
      `INSERT INTO cloud_sync_meta (wallet_id, last_sync_at) VALUES (?, ?)
       ON CONFLICT(wallet_id) DO UPDATE SET last_sync_at = excluded.last_sync_at;`,
      [walletId, iso]
    );
  } catch {}
}

async function pushPending(walletId: number, cloudWalletId: string): Promise<number> {
  // Find pending locals
  const pending: any[] = await exec(
    `SELECT id, wallet_id, type, amount, category, date, notes, cloud_external_id, cloud_updated_at
     FROM transactions WHERE wallet_id = ? AND (sync_status = 'pending' OR sync_status IS NULL OR cloud_external_id IS NULL);`,
    [walletId]
  );
  if (pending.length === 0) return 0;

  // Ensure every pending has an externalId
  const now = new Date().toISOString();
  for (const row of pending) {
    if (!row.cloud_external_id) {
      const newId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${row.id}`;
      await execRun('UPDATE transactions SET cloud_external_id = ?, cloud_updated_at = ?, sync_status = ? WHERE id = ?;', [
        newId,
        now,
        'pending',
        row.id,
      ]);
      row.cloud_external_id = newId;
      row.cloud_updated_at = now;
    }
  }

  // Re-fetch to get updated externalIds
  const toPush: any[] = await exec(
    `SELECT cloud_external_id as externalId, type, amount, category, date, notes, cloud_updated_at as updatedAt
     FROM transactions WHERE wallet_id = ? AND sync_status = 'pending' AND cloud_external_id IS NOT NULL;`,
    [walletId]
  );
  if (toPush.length === 0) return 0;

  const payload = toPush.map((r) => ({
    externalId: r.externalId,
    type: r.type as 'income' | 'expense' | 'transfer',
    amount: Math.abs(Number(r.amount)),
    category: r.category ?? null,
    date: r.date,
    notes: r.notes ?? null,
    updatedAt: r.updatedAt ?? now,
  }));

  await syncWalletTransactions(cloudWalletId, payload);

  // Mark as synced
  const ids = toPush.map((r) => r.externalId);
  // Update each by externalId
  for (const ext of ids) {
    await execRun(`UPDATE transactions SET sync_status = 'synced', cloud_updated_at = ? WHERE cloud_external_id = ?;`, [now, ext]);
  }
  return payload.length;
}

async function pullRemote(walletId: number, cloudWalletId: string): Promise<number> {
  const lastSync = await getLastSyncAt(walletId);
  let offset = 0;
  let totalPulled = 0;
  let maxUpdatedAt: string | null = lastSync;

  while (true) {
    const res = await listSharedWalletTransactions(cloudWalletId, {
      limit: PULL_LIMIT,
      offset,
      since: lastSync ?? undefined,
    });
    const remote: SharedTransactionRow[] = res.transactions ?? [];
    if (remote.length === 0) break;

    for (const r of remote) {
      const localRows: any[] = await exec('SELECT id, cloud_updated_at FROM transactions WHERE cloud_external_id = ?;', [r.externalId]);
      const existing = localRows[0];
      const isNewer = !existing || !existing.cloud_updated_at || r.updatedAt > existing.cloud_updated_at;

      if (!existing) {
        // Insert
        const amount = r.type === 'expense' ? -Math.abs(Number(r.amount)) : Math.abs(Number(r.amount));
        await execRun(
          `INSERT INTO transactions (wallet_id, type, amount, category, date, notes, cloud_external_id, cloud_updated_at, sync_status, is_recurring)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            walletId,
            r.type,
            amount,
            r.category,
            r.date,
            r.notes,
            r.externalId,
            r.updatedAt,
            'synced',
            0,
          ]
        );
        // Note: is_recurring default 0, other fields null
        totalPulled++;
      } else if (isNewer) {
        const amount = r.type === 'expense' ? -Math.abs(Number(r.amount)) : Math.abs(Number(r.amount));
        await execRun(
          `UPDATE transactions SET type = ?, amount = ?, category = ?, date = ?, notes = ?, cloud_updated_at = ?, sync_status = 'synced' WHERE cloud_external_id = ?;`,
          [r.type, amount, r.category, r.date, r.notes, r.updatedAt, r.externalId]
        );
        totalPulled++;
      }

      if (!maxUpdatedAt || r.updatedAt > maxUpdatedAt) maxUpdatedAt = r.updatedAt;
    }

    if (remote.length < PULL_LIMIT) break;
    offset += PULL_LIMIT;
    if (offset > 1000) break; // safety
  }

  if (maxUpdatedAt && maxUpdatedAt !== lastSync) {
    await setLastSyncAt(walletId, maxUpdatedAt);
  }

  if (totalPulled > 0) {
    invalidateTransactionCaches();
    try {
      await refreshDerivedFinanceStateForWallets([walletId]);
    } catch {}
  }

  return totalPulled;
}

export async function syncSharedWallet(walletId: number): Promise<{ pushed: number; pulled: number } | null> {
  if (!isSyncEligible()) return null;
  if (ongoingSync.has(walletId)) return null;
  ongoingSync.add(walletId);
  try {
    const walletRows: any[] = await exec('SELECT cloud_wallet_id, is_shared FROM wallets WHERE id = ?;', [walletId]);
    const w = walletRows[0];
    if (!w || Number(w.is_shared) !== 1 || !w.cloud_wallet_id) return null;
    const cloudWalletId: string = w.cloud_wallet_id;

    let pushed = 0;
    let pulled = 0;
    try {
      pushed = await pushPending(walletId, cloudWalletId);
    } catch (e) {
      logError('[Sync] push failed', { walletId, error: e as any });
    }
    try {
      pulled = await pullRemote(walletId, cloudWalletId);
    } catch (e) {
      logError('[Sync] pull failed', { walletId, error: e as any });
    }

    if (pushed > 0 || pulled > 0) {
      log('[Sync] wallet synced', { walletId, pushed, pulled });
    }
    return { pushed, pulled };
  } finally {
    ongoingSync.delete(walletId);
  }
}
