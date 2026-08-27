/**
 * Web-only DB entry point – no native SQLite imports.
 * Metro picks this file for `platform === 'web'` (index.web.ts).
 * Uses IndexedDB + sql.js via src/lib/db/webDriver.ts only.
 */
import { log, error as logError } from '@/utils/logger';
import { clearCoreTables, ensureSchema } from './schema';
import { getWebDatabase } from './webDriver';

let dbPromise: Promise<any> | null = null;

const CURRENT_SCHEMA_VERSION = 4;

export async function getDbAsync(): Promise<any> {
  if (!dbPromise) {
    dbPromise = getWebDatabase();
  }
  return dbPromise;
}

// web has no sync handle – throw to surface misuse
export function getDbSync(): never {
  throw new Error('getDbSync is not available on web. Use getDbAsync().');
}

export async function initDb(): Promise<void> {
  await getDbAsync();
}

export async function exec<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const database = await getDbAsync();
    const result = await database.executeAsync(sql, params);
    return (result.rows?._array || []) as T[];
  } catch (err: any) {
    logError('[DB] Query execution failed:', { sql, params, error: err });
    throw err;
  }
}

export async function execRun(sql: string, params: any[] = []): Promise<any> {
  try {
    const database = await getDbAsync();
    const result = await database.executeAsync(sql, params);
    return result;
  } catch (err: any) {
    logError('[DB] Run execution failed:', { sql, params, error: err });
    throw err;
  }
}

export async function ensureTables() {
  const database = await getDbAsync();
  await ensureSchema(database, CURRENT_SCHEMA_VERSION);
}

export async function clearDatabase() {
  const database = await getDbAsync();
  await clearCoreTables(database);
}

// keep resolveDbPath out – not used on web
