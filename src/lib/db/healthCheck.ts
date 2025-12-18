import { error as logError, log } from '@/utils/logger';
import { emit } from '@/lib/events/eventBus';
import { getDb } from './index';

let intervalHandle: any = null;

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.getAllAsync('SELECT 1;');
    return true;
  } catch (err: any) {
    logError('[DB] Health check failed', { error: err, code: err?.code, message: err?.message });
    // Emit a fatal event for observers (no UI side-effects here)
    emit('db:fatal', { source: 'healthCheck', error: err });
    return false;
  }
}

export function startDatabaseHealthCheck(intervalMs: number = 60000): () => void {
  if (intervalHandle) return stopDatabaseHealthCheck; // already running
  intervalHandle = setInterval(() => {
    checkDatabaseHealth().then((ok) => {
      if (ok) {
        // Lightweight trace only in dev or when logging is enabled
        log('[DB] Health OK');
      }
    });
  }, intervalMs);
  return stopDatabaseHealthCheck;
}

export function stopDatabaseHealthCheck() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
