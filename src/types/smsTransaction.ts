/**
 * Domain types for SMS-based transaction detection.
 *
 * SMS monitoring is a best-effort alternative to bank/mobile-money APIs.
 * Messages from providers (Airtel Money, TNM Mpamba, banks) are parsed
 * and stored as "pending" entries that the user confirms in-app before
 * they become real transactions.
 */

export type SmsProvider = 'airtel_money' | 'tnm_mpamba' | 'bank';

export type SmsDirection = 'income' | 'expense';

export interface ParsedSmsTransaction {
  provider: SmsProvider;
  amount: number;
  direction: SmsDirection;
  /** Account/available balance reported after the transaction, if found. */
  balanceAfter?: number;
  /** Transaction reference/id extracted from the message, if any. */
  reference?: string;
  /** ISO date (YYYY-MM-DD) extracted from the message, if any. */
  occurredAt?: string;
  /** Best-effort counterparty (peer name or number), if found. */
  counterparty?: string;
}

export type PendingSmsStatus = 'pending' | 'confirmed' | 'ignored';

export interface PendingSmsTransaction {
  id?: number;
  provider: SmsProvider | null;
  sender: string;
  body: string;
  amount: number | null;
  type: SmsDirection | null;
  balance_after: number | null;
  reference: string | null;
  occurred_at: string | null;
  detected_at: string;
  status: PendingSmsStatus;
  suggested_wallet_id: number | null;
  transaction_id: number | null;
  created_at: string;
}

/** Payload received by the headless task (must be plain JSON-able values). */
export interface SmsHeadlessPayload {
  sender: string;
  body: string;
  receivedAt: number;
}
