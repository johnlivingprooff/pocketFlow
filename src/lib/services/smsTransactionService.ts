/**
 * smsTransactionService.ts - Android SMS monitoring service.
 *
 * Two paths feed this service:
 *
 * 1. HEADLESS TASK (app killed / background)
 *    The native SmsIncomingReceiver (injected by plugins/withSmsReader) is
 *    woken by the SMS_RECEIVED broadcast and starts SmsHeadlessTaskService,
 *    which boots a minimal JS context and calls the "SmsTransactionTask"
 *    registered below. Parsed messages are stored as PENDING entries.
 *
 * 2. APP RUNTIME
 *    runSmsRuntimeGateCheck() verifies permissions on startup; the same
 *    pending table is surfaced to the UI for confirmation.
 *
 * Parsed SMS never becomes a real transaction automatically: it lands in
 * pending_sms_transactions and the user confirms/edits it in-app.
 *
 * Android-only. iOS has no public SMS-reading API.
 */

import { AppRegistry, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDb, ensureTables } from '@/lib/db';
import { flushWriteQueue } from '@/lib/db/writeQueue';
import {
  buildDedupeKey,
  parseIncomingSms,
} from './smsParser';
import {
  findWalletForProvider,
  insertPendingSms,
} from '@/lib/db/pendingTransactions';
import { useSettings } from '@/store/useStore';
import { log, warn, error as logError } from '@/utils/logger';
import type { SmsHeadlessPayload } from '@/types/smsTransaction';

export const SMS_HEADLESS_TASK_NAME = 'SmsTransactionTask';

const SETTINGS_STORAGE_KEY = 'pocketflow-settings';

/**
 * Read the smsScanningEnabled flag straight from persisted storage.
 * The headless JS context has no React tree, so we cannot rely on the
 * zustand store instance alone.
 */
export async function isSmsScanningEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { smsScanningEnabled?: boolean } };
    return parsed.state?.smsScanningEnabled === true;
  } catch {
    return useSettings.getState().smsScanningEnabled;
  }
}

/**
 * Core ingestion path shared by the headless task and any future
 * in-app listener. Parses the message and stores it as a pending entry.
 */
export async function handleIncomingSms(
  sender: string,
  body: string,
  receivedAt: number
): Promise<void> {
  const parsed = parseIncomingSms(sender, body);
  if (!parsed) {
    log('[SmsService] Ignored non-financial SMS', { sender, preview: body.slice(0, 80) });
    return;
  }

  const suggestedWalletId = await findWalletForProvider(parsed.provider);
  const dedupeKey = buildDedupeKey(sender, body, parsed.occurredAt);

  const insertedId = await insertPendingSms({
    provider: parsed.provider,
    sender,
    body,
    amount: parsed.amount,
    type: parsed.direction,
    balanceAfter: parsed.balanceAfter,
    reference: parsed.reference,
    occurredAt: parsed.occurredAt,
    detectedAt: new Date(receivedAt).toISOString(),
    dedupeKey,
    suggestedWalletId,
  });

  if (insertedId !== null) {
    log('[SmsService] Pending SMS transaction stored', {
      id: insertedId,
      provider: parsed.provider,
      amount: parsed.amount,
      direction: parsed.direction,
    });
  } else {
    log('[SmsService] Duplicate SMS skipped', { sender, dedupeKey });
  }
}

/**
 * Headless task entry point. Runs inside a bare JS context: must bootstrap
 * the database itself and flush the write queue before the runtime shuts down.
 */
export async function runSmsHeadlessTask(payload: SmsHeadlessPayload): Promise<void> {
  try {
    if (!(await isSmsScanningEnabled())) {
      log('[SmsService] Scanning disabled, headless task skipping');
      return;
    }

    await initDb();
    await ensureTables();

    const sender = typeof payload?.sender === 'string' ? payload.sender : '';
    const body = typeof payload?.body === 'string' ? payload.body : '';
    const receivedAt =
      typeof payload?.receivedAt === 'number' ? payload.receivedAt : Date.now();

    await handleIncomingSms(sender, body, receivedAt);
  } catch (err: unknown) {
    logError('[SmsService] Headless task failed', { error: err });
  } finally {
    await flushWriteQueue();
  }
}

/**
 * Register the headless task. This must run at bundle evaluation time so the
 * native side can find the task when the app is launched from the SMS
 * broadcast receiver. Module-scope registration in this file is enough
 * because smsTransactionService is imported from app/_layout.tsx, which is
 * statically reachable from the entry bundle.
 */
if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask(SMS_HEADLESS_TASK_NAME, () => runSmsHeadlessTask);
}

export interface SmsPermissionStatus {
  readSms: boolean;
  receiveSms: boolean;
}

export async function getSmsPermissionStatus(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return { readSms: false, receiveSms: false };
  try {
    const [readSms, receiveSms] = await Promise.all([
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS),
    ]);
    return { readSms, receiveSms };
  } catch {
    return { readSms: false, receiveSms: false };
  }
}

/** Request READ_SMS + RECEIVE_SMS with an explanatory rationale. */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const rationale = {
    title: 'Read transaction SMS',
    message:
      'pocketFlow reads SMS from Airtel Money, TNM Mpamba and banks to auto-create ' +
      'pending expense/income entries that you confirm in-app. Messages are never uploaded.',
    buttonPositive: 'Allow',
    buttonNegative: 'Cancel',
  };

  try {
    const [readResult, receiveResult] = await Promise.all([
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, rationale),
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, rationale),
    ]);
    const granted =
      readResult === PermissionsAndroid.RESULTS.GRANTED &&
      receiveResult === PermissionsAndroid.RESULTS.GRANTED;
    useSettings.getState().setSmsPermissionStatus(granted ? 'granted' : 'denied');
    return granted;
  } catch (err: unknown) {
    logError('[SmsService] Permission request failed', { error: err });
    return false;
  }
}

/**
 * Called on app start: logs the current permission state so failures are
 * visible. Never prompts at startup (matches reminder behaviour).
 */
export async function runSmsRuntimeGateCheck(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const enabled = await isSmsScanningEnabled();
  if (!enabled) return;

  const status = await getSmsPermissionStatus();
  useSettings.getState().setSmsPermissionStatus(
    status.readSms && status.receiveSms ? 'granted' : 'denied'
  );

  if (!status.readSms || !status.receiveSms) {
    warn('[SmsService] SMS permission missing - automatic entries are paused', status);
  } else {
    log('[SmsService] SMS scanning ready', status);
  }
}

/**
 * Toggle SMS scanning from the UI. Requests permissions when enabling.
 * @returns true when the requested state is active (permissions granted).
 */
export async function setSmsScanningEnabled(enabled: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') {
    useSettings.getState().setSmsScanningEnabled(false);
    return false;
  }

  if (enabled) {
    const granted = await requestSmsPermission();
    if (!granted) {
      useSettings.getState().setSmsScanningEnabled(false);
      warn('[SmsService] SMS permission not granted - scanning disabled');
      return false;
    }
    useSettings.getState().setSmsScanningEnabled(true);
    return true;
  }

  useSettings.getState().setSmsScanningEnabled(false);
  return false;
}
