
import { open } from 'react-native-nitro-sqlite';
import type { NitroSQLiteConnection } from 'react-native-nitro-sqlite';
import { enableSimpleNullHandling } from 'react-native-nitro-sqlite';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { log, error as logError, warn } from '@/utils/logger';
import { clearCoreTables, ensureSchema } from './schema';

let dbPromise: Promise<NitroSQLiteConnection | any> | null = null;

// Schema version - increment this when making breaking schema changes
const CURRENT_SCHEMA_VERSION = 4;

async function resolveDbPath(): Promise<string> {
  // For nitro-sqlite with just a name, the database is stored in the app's data directory
  // We need to construct the full path for file operations like deletion
  const dir = (FileSystem as any).documentDirectory;
  if (!dir) throw new Error('Could not resolve document directory for database');
  const cleanDir = dir.startsWith('file://') ? dir.replace('file://', '') : dir;
  return `${cleanDir}SQLite/pocketflow.db`;
}

async function openDb(): Promise<NitroSQLiteConnection> {
  // Enable simple null handling for nitro-sqlite
  enableSimpleNullHandling(true);
  
  let db: NitroSQLiteConnection;
  try {
    db = open({ name: 'pocketflow.db' });
    try {
      const integrityCheck = db.execute('PRAGMA integrity_check;');
      const result = integrityCheck.rows?._array[0];
      const isCorrupt = result && result.integrity_check !== 'ok';
      if (isCorrupt) {
        logError('[DB] Database corruption detected! Deleting and recreating database...');
        db.close();
        try {
          const dbPath = await resolveDbPath();
          await FileSystem.deleteAsync(`file://${dbPath}`, { idempotent: true });
        } catch (deleteErr) {
          logError('[DB] Failed to delete corrupted database file:', deleteErr as any);
        }
        db = open({ name: 'pocketflow.db' });
        log('[DB] Fresh database created successfully');
      } else {
        log('[DB] Database integrity check passed');
      }
    } catch (integrityError: any) {
      logError('[DB] Integrity check failed, database may be corrupted:', integrityError);
    }
    try {
      db.execute('PRAGMA journal_mode = WAL;');
      log('[DB] WAL mode enabled successfully');
      db.execute('PRAGMA busy_timeout = 5000;'); // 5 seconds
      db.execute('PRAGMA synchronous = NORMAL;');
      log('[DB] Database connection opened successfully with WAL mode enabled');
    } catch (pragmaError: any) {
      logError('[DB] Failed to configure database PRAGMAs:', pragmaError);
      warn('[DB] Database opened but not optimally configured - lock errors may occur');
    }
    return db;
  } catch (err: any) {
    logError('[DB] Failed to open database:', err);
    throw new Error(`Failed to open database: ${err?.message || err}`);
  }
}

export async function getDbAsync(): Promise<NitroSQLiteConnection | any> {
  if (Platform.OS === 'web') {
      const { getWebDatabase } = await import('./webDriver');
    // On web, use the web driver backed by IndexedDB and sql.js
    if (!dbPromise) {
      dbPromise = getWebDatabase();
    }
    return dbPromise;
  }

  // On mobile, use native SQLite via nitro-sqlite
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}

// Synchronous fallback for legacy code (will throw if not initialized)
let _dbSync: NitroSQLiteConnection | null = null;
export function getDbSync(): NitroSQLiteConnection {
  if (_dbSync) return _dbSync;
  throw new Error('Database not initialized. Use getDbAsync() and await initialization before use.');
}

// Call this once at app startup (e.g. in _layout.tsx)
export async function initDb(): Promise<void> {
  if (Platform.OS !== 'web') {
    _dbSync = await getDbAsync() as NitroSQLiteConnection;
  } else {
    // On web, just initialize the web driver
    await getDbAsync();
  }
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
