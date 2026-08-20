/**
 * smsParser.ts - Pure, side-effect-free parsing of financial SMS messages.
 *
 * Matches incoming messages from Airtel Money, TNM Mpamba and Malawian banks
 * and extracts: amount, direction (income/expense), balance, reference, date
 * and counterparty. Everything here is a pure function so it is unit-testable
 * without a device (see tests/sms-parser.test.ts).
 *
 * Provider detection is sender-first (e.g. "AIRTELMONEY", "Mpamba", bank
 * shortcodes) with a body-keyword fallback for unknown sender addresses.
 */

import type {
  ParsedSmsTransaction,
  SmsDirection,
  SmsProvider,
} from '../../types/smsTransaction';

const BANK_SENDER_KEYWORDS = [
  'bank',
  'nbm',
  'nbs',
  'fmb',
  'ecobank',
  'first capital',
  'standard bank',
  'opportunity',
  'mybucks',
  'zao',
  'indebank',
  'cdh',
  'fcmb',
];

const BANK_BODY_KEYWORDS = [
  'debit alert',
  'credit alert',
  'transaction alert',
  'acct ',
  'account ',
];

/** Currency tokens used by Malawian providers (order matters: MWK before MK before K). */
const CURRENCY_TOKEN = '(?:MWK|MKW|MK|K)';

/** Amount like 1,500.00 / 500 / 12.5 */
const AMOUNT_PATTERN = `(?:${CURRENCY_TOKEN})\\s*([\\d,]+(?:\\.\\d{1,2})?)`;

const AMOUNT_RE = new RegExp(AMOUNT_PATTERN, 'i');

const BALANCE_RE =
  /(?:balance|avail(?:able)?)\s*(?:is|:|-|=|\s)*\s*(?:MWK|MKW|MK|K)?\s*([\d,]+(?:\.\d{1,2})?)/gi;

const REFERENCE_RE =
  /(?:ref|ref\s*no|reference|trx\s*id|transaction\s*id|txn\s*id)\s*[:#.\s]*([a-z0-9-]+)/i;

/** DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY (Malawi uses day-first). */
const DATE_RE = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;

const INCOME_PATTERNS = [
  /\byou\s+(?:have\s+)?received\b/i,
  /\breceived\s+from\b/i,
  /\bcredited\s+with\b/i,
  /\bcredit\s+alert\b/i,
  /\bpaid\s+in\b/i,
  /\btop\s*up\b/i,
  /\bpayment\s+from\b/i,
  /\btransfer(?:red)?\s+(?:from|in)\b/i,
  /\bdeposit(?:ed)?\b/i,
];

const EXPENSE_PATTERNS = [
  /\byou\s+(?:have\s+)?sent\b/i,
  /\bsent\s+(?:to|via)\b/i,
  /\bdebited\s+with\b/i,
  /\bdebit\s+alert\b/i,
  /\bpaid\s+(?:to|out|for)\b/i,
  /\byou\s+paid\b/i,
  /\bwithdrawn\b/i,
  /\bpayment\s+of\b/i,
  /\bspent\b/i,
  /\btransfer(?:red)?\s+(?:to|out)\b/i,
  /\bcharged\b/i,
];

const COUNTERPARTY_AFTER_RE = /\b(?:from|to)\s+([a-z0-9@.+*#-][a-z0-9@.+*#\s-]*?)(?=\s+(?:on|at|on\s+\d|ref|balance|avail|\d|$)|\.|$)/i;

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripThousands(value: string): string {
  return value.replace(/,/g, '');
}

function toNumber(raw: string): number {
  const numeric = parseFloat(stripThousands(raw.trim()));
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Detect the provider based on the sender address, with a body-keyword
 * fallback for messages arriving from unknown shortcodes.
 */
export function detectProvider(sender: string, body?: string): SmsProvider | null {
  const normalizedSender = normalizeSpacing(sender).toLowerCase();
  const normalizedBody = body ? normalizeSpacing(body).toLowerCase() : '';

  if (/airtel/.test(normalizedSender) || /airtel/.test(normalizedBody)) {
    return 'airtel_money';
  }
  if (/mpamba|tnm/.test(normalizedSender) || /mpamba|tnm/.test(normalizedBody)) {
    return 'tnm_mpamba';
  }
  if (
    BANK_SENDER_KEYWORDS.some((keyword) => normalizedSender.includes(keyword)) ||
    BANK_BODY_KEYWORDS.some((keyword) => normalizedBody.includes(keyword))
  ) {
    return 'bank';
  }

  return null;
}

function detectDirection(body: string): SmsDirection | null {
  const normalized = normalizeSpacing(body);

  if (INCOME_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'income';
  }
  if (EXPENSE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'expense';
  }

  return null;
}

function extractAmount(body: string): number | null {
  const match = body.match(AMOUNT_RE);
  if (!match || !match[1]) return null;
  const value = toNumber(match[1]);
  return value > 0 ? value : null;
}

function extractBalance(body: string): number | null {
  const matches = [...body.matchAll(BALANCE_RE)];
  const raw = matches[matches.length - 1]?.[1];
  if (!raw) return null;
  const value = toNumber(raw);
  return value >= 0 ? value : null;
}

function extractReference(body: string): string | null {
  const match = body.match(REFERENCE_RE);
  return match?.[1] ? match[1].toUpperCase() : null;
}

function extractDate(body: string): string | null {
  const match = body.match(DATE_RE);
  if (!match) return null;

  let day = parseInt(match[1], 10);
  let month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Malawi uses DD/MM/YYYY; swap if clearly US-ordered.
  if (month > 12 && day <= 12) {
    const swapped = day;
    day = month;
    month = swapped;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 100) year += 2000;

  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

function extractCounterparty(body: string): string | null {
  const normalized = normalizeSpacing(body);
  const match = normalized.match(COUNTERPARTY_AFTER_RE);
  if (!match || !match[1]) return null;

  const raw = match[1].trim();
  if (raw.length < 2 || raw.length > 40) return null;
  // Ignore captures that are actually other data (e.g. dates or amounts).
  if (/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(raw)) return null;

  return raw;
}

/**
 * Parse a financial SMS body into a structured transaction.
 * Returns null when the message is not a recognisable financial message.
 */
export function parseSmsTransaction(body: string): ParsedSmsTransaction | null {
  const normalized = normalizeSpacing(body);
  if (!normalized) return null;

  const amount = extractAmount(normalized);
  const direction = detectDirection(normalized);
  if (amount === null || direction === null) return null;

  const result: ParsedSmsTransaction = {
    provider: 'bank', // placeholder; caller sets the real provider from sender
    amount,
    direction,
  };

  const balanceAfter = extractBalance(normalized);
  if (balanceAfter !== null) result.balanceAfter = balanceAfter;

  const reference = extractReference(normalized);
  if (reference) result.reference = reference;

  const occurredAt = extractDate(normalized);
  if (occurredAt) result.occurredAt = occurredAt;

  const counterparty = extractCounterparty(normalized);
  if (counterparty) result.counterparty = counterparty;

  return result;
}

/**
 * Full pipeline: detect provider from sender (+body fallback), then parse.
 * Returns null when the message is not a financial SMS we can handle.
 */
export function parseIncomingSms(
  sender: string,
  body: string
): ParsedSmsTransaction | null {
  const provider = detectProvider(sender, body);
  if (!provider) return null;

  const parsed = parseSmsTransaction(body);
  if (!parsed) return null;

  parsed.provider = provider;
  return parsed;
}

/**
 * Stable dedupe key for a given raw message, so the same SMS delivered
 * twice (or re-broadcast) is not inserted twice.
 */
export function buildDedupeKey(sender: string, body: string, occurredAt?: string): string {
  const parts = [
    normalizeSpacing(sender).toLowerCase(),
    normalizeSpacing(body).toLowerCase(),
    occurredAt ?? '',
  ];
  return parts.join('|');
}
