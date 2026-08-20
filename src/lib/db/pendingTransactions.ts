/**
 * pendingTransactions.ts - Repository for the pending_sms_transactions table.
 *
 * SMS-detected transactions are stored as PENDING entries (never written
 * straight into `transactions`), because SMS parsing is best-effort and the
 * user must confirm/edit before the entry becomes a real transaction.
 *
 * All writes go through the write queue (enqueueWrite) per project rules.
 */

import { enqueueWrite } from './writeQueue';
import { exec, execRun } from './index';
import type { PendingSmsStatus, PendingSmsTransaction, SmsProvider } from '@/types/smsTransaction';

const TABLE = 'pending_sms_transactions';

export interface InsertPendingSmsInput {
  provider: SmsProvider;
  sender: string;
  body: string;
  amount: number;
  type: 'income' | 'expense';
  balanceAfter?: number;
  reference?: string;
  occurredAt?: string;
  detectedAt: string;
  dedupeKey: string;
  suggestedWalletId?: number | null;
}

export interface ConfirmPendingSmsInput {
  walletId: number;
  amount?: number;
  type?: 'income' | 'expense';
  category?: string;
  date?: string; // ISO
  notes?: string;
}

/**
 * Insert a parsed SMS as a pending transaction.
 * The UNIQUE dedupe_key makes re-delivered messages a no-op (returns null).
 * @returns the new row id, or null when the message was already ingested.
 */
export async function insertPendingSms(
  input: InsertPendingSmsInput
): Promise<number | null> {
  return enqueueWrite(async () => {
    const result = await execRun(
      `INSERT OR IGNORE INTO ${TABLE} (
        provider, sender, body, amount, type, balance_after, reference,
        occurred_at, detected_at, dedupe_key, suggested_wallet_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');`,
      [
        input.provider,
        input.sender,
        input.body,
        input.amount,
        input.type,
        input.balanceAfter ?? null,
        input.reference ?? null,
        input.occurredAt ?? null,
        input.detectedAt,
        input.dedupeKey,
        input.suggestedWalletId ?? null,
      ]
    );

    const inserted = result?.rowsAffected ?? 0;
    if (inserted === 0) return null;

    const rows = await exec<{ id: number }>(
      `SELECT id FROM ${TABLE} WHERE dedupe_key = ? LIMIT 1;`,
      [input.dedupeKey]
    );
    return rows[0]?.id ?? null;
  }, 'insertPendingSms');
}

/** List pending (unresolved) SMS transactions, newest first. */
export async function getPendingSmsList(status: PendingSmsStatus = 'pending'): Promise<PendingSmsTransaction[]> {
  return exec<PendingSmsTransaction>(
    `SELECT * FROM ${TABLE} WHERE status = ? ORDER BY detected_at DESC;`,
    [status]
  );
}

export async function getPendingSmsById(id: number): Promise<PendingSmsTransaction | null> {
  const rows = await exec<PendingSmsTransaction>(
    `SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1;`,
    [id]
  );
  return rows[0] ?? null;
}

/** Count of SMS entries awaiting user confirmation (for badges). */
export async function countPendingSms(): Promise<number> {
  const rows = await exec<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE} WHERE status = 'pending';`
  );
  return rows[0]?.count ?? 0;
}

export async function updatePendingSmsStatus(
  id: number,
  status: PendingSmsStatus,
  transactionId?: number
): Promise<void> {
  await enqueueWrite(async () => {
    await execRun(
      `UPDATE ${TABLE} SET status = ?, transaction_id = COALESCE(?, transaction_id) WHERE id = ?;`,
      [status, transactionId ?? null, id]
    );
  }, 'updatePendingSmsStatus');
}

/**
 * Suggest a wallet for a detected provider by matching the wallet's
 * serviceProvider / phoneNumber metadata; falls back to the primary wallet.
 */
export async function findWalletForProvider(
  provider: SmsProvider
): Promise<number | null> {
  const keyword = provider === 'airtel_money' ? 'airtel' : provider === 'tnm_mpamba' ? 'mpamba' : 'bank';

  const matched = await exec<{ id: number }>(
    `SELECT id FROM wallets
     WHERE LOWER(COALESCE(serviceProvider, '')) LIKE ?
     ORDER BY is_primary DESC, id ASC LIMIT 1;`,
    [`%${keyword}%`]
  );
  if (matched[0]) return matched[0].id;

  const primary = await exec<{ id: number }>(
    `SELECT id FROM wallets WHERE is_primary = 1 ORDER BY id ASC LIMIT 1;`
  );
  return primary[0]?.id ?? null;
}

/**
 * Promote a pending SMS entry to a real transaction (user-confirmed).
 * @returns the new transaction id.
 */
export async function confirmPendingSms(
  id: number,
  input: ConfirmPendingSmsInput
): Promise<number | null> {
  return enqueueWrite(async () => {
    const pending = await getPendingSmsById(id);
    if (!pending) return null;

    const amount = input.amount ?? pending.amount ?? 0;
    const type = input.type ?? pending.type ?? 'expense';
    const date = input.date ?? pending.occurred_at ?? new Date().toISOString();
    const notes =
      input.notes ??
      [pending.reference && `Ref ${pending.reference}`, `Via SMS (${pending.provider ?? 'unknown'})`]
        .filter(Boolean)
        .join(' - ');

    const result = await execRun(
      `INSERT INTO transactions (wallet_id, amount, type, category, date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [input.walletId, amount, type, input.category ?? null, date, notes, new Date().toISOString()]
    );

    const insertedId = result?.insertId ?? null;
    if (insertedId == null) return null;

    await execRun(
      `UPDATE ${TABLE} SET status = 'confirmed', transaction_id = ?, suggested_wallet_id = ? WHERE id = ?;`,
      [insertedId, input.walletId, id]
    );

    return insertedId as number;
  }, 'confirmPendingSms');
}

/** Permanently discard a pending entry (e.g. user rejects it). */
export async function ignorePendingSms(id: number): Promise<void> {
  await updatePendingSmsStatus(id, 'ignored');
}
