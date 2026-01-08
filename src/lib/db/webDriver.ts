/**
 * Web Storage Driver for pocketFlow
 * 
 * Provides a SQLite-compatible database layer for web using IndexedDB and sql.js
 * Implements the same interface as NitroSQLiteConnection to ensure cross-platform compatibility
 */

import { log, error as logError, warn } from '@/utils/logger';

const SQL_JS_URL = 'https://sql.js.org/dist/sql-wasm.js';
const locateFile = (file: string) => `${SQL_JS_URL.replace('sql-wasm.js', '')}${file}`;

// Load sql.js as an ES module via dynamic import to avoid bundling and import.meta errors
let SQL: any = null;
const sqlInitPromise = (async () => {
  // If already present globally (unlikely on web), reuse it
  if ((window as any).initSqlJs) {
    return (window as any).initSqlJs({ locateFile });
  }

  try {
    // Use dynamic runtime import so Metro/Expo does not try to bundle sql.js (prevents import.meta errors)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const module = await (new Function('u', 'return import(u);'))(SQL_JS_URL);
    const initSqlJs = (module as any).default ?? (module as any).initSqlJs;
    if (!initSqlJs) {
      throw new Error('sql.js module did not expose initSqlJs');
    }
    return initSqlJs({ locateFile });
  } catch (err) {
    logError('[WebDB] Failed to load sql.js module', err as Record<string, any>);
    throw err;
  }
})();

// IndexedDB constants
const DB_NAME = 'pocketflow_web';
const STORE_NAME = 'database';
const DB_KEY = 'pocketflow';

/**
 * Interface matching NitroSQLiteConnection for cross-platform compatibility
 */
interface WebDatabaseConnection {
  executeAsync(sql: string, params?: any[]): Promise<{ rows: { _array: any[] } }>;
  execute(sql: string, params?: any[]): { rows: { _array: any[] } };
  close(): void;
  transaction(callback: (tx: any) => Promise<void>): Promise<void>;
}

class WriteQueue {
  private queue: Array<{
    fn: () => Promise<void>;
    name?: string;
    resolve: () => void;
    reject: (err: any) => void;
  }> = [];
  private processing = false;

  async enqueue(
    fn: () => Promise<void>,
    name?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, name, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, name, resolve, reject } = this.queue.shift()!;
      const startTime = Date.now();
      
      try {
        log(`[WriteQueue] Executing ${name || 'write'}`);
        await fn();
        const duration = Date.now() - startTime;
        log(`[WriteQueue] Completed ${name || 'write'} in ${duration}ms`);
        resolve();
      } catch (err) {
        const duration = Date.now() - startTime;
      logError(`[WriteQueue] Failed ${name || 'write'} in ${duration}ms:`, err as Record<string, any>);
        reject(err);
      }
    }

    this.processing = false;
  }
}

const writeQueue = new WriteQueue();

class WebDatabaseImpl implements WebDatabaseConnection {
  private sqlDb: any | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load sql.js if not already loaded
      if (!SQL) {
        SQL = await sqlInitPromise;
        log('[WebDB] sql.js initialized');
      }

      // Try to load existing DB from IndexedDB
      const existingDb = await this.loadFromIndexedDB();
      if (existingDb) {
        this.sqlDb = new SQL.Database(existingDb);
        log('[WebDB] Database loaded from IndexedDB');
      } else {
        this.sqlDb = new SQL.Database();
        log('[WebDB] New database created');
      }

      this.isInitialized = true;
    } catch (err) {
      logError('[WebDB] Initialization failed:', err as Record<string, any>);
      throw err;
    }
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getRequest = store.get(DB_KEY);

          getRequest.onsuccess = () => {
            resolve(getRequest.result as Uint8Array | null);
            db.close();
          };

          getRequest.onerror = () => {
            reject(getRequest.error);
            db.close();
          };
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private async saveToIndexedDB(): Promise<void> {
    if (!this.sqlDb) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const data = this.sqlDb!.export();
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const putRequest = store.put(data, DB_KEY);

          putRequest.onsuccess = () => {
            resolve();
            db.close();
          };

          putRequest.onerror = () => {
            reject(putRequest.error);
            db.close();
          };
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async executeAsync(
    sql: string,
    params: any[] = []
  ): Promise<{ rows: { _array: any[] } }> {
    if (!this.isInitialized) await this.initialize();
    if (!this.sqlDb) throw new Error('Database not initialized');

    try {
      const stmt = this.sqlDb.prepare(sql);
      stmt.bind(params);

      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();

      // Persist changes to IndexedDB after write operations
      const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|PRAGMA)\s/i.test(
        sql
      );
      if (isWrite) {
        await this.saveToIndexedDB();
      }

      return { rows: { _array: rows } };
    } catch (err: any) {
      logError('[WebDB] Query execution failed:', { sql, params, error: err });
      throw err;
    }
  }

  execute(
    sql: string,
    params: any[] = []
  ): { rows: { _array: any[] } } {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Use executeAsync first.');
    }
    if (!this.sqlDb) throw new Error('Database not initialized');

    try {
      const stmt = this.sqlDb.prepare(sql);
      stmt.bind(params);

      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();

      // Persist changes to IndexedDB after write operations (sync)
      const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|PRAGMA)\s/i.test(
        sql
      );
      if (isWrite) {
        // Note: This is blocking; in production, consider using executeAsync for writes
        const data = this.sqlDb.export();
        const idbRequest = indexedDB.open(DB_NAME, 1);
        
        idbRequest.onsuccess = () => {
          const db = idbRequest.result;
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(data, DB_KEY);
          db.close();
        };
      }

      return { rows: { _array: rows } };
    } catch (err: any) {
      logError('[WebDB] Query execution failed:', { sql, params, error: err });
      throw err;
    }
  }

  close(): void {
    if (this.sqlDb) {
      this.sqlDb.close();
      this.sqlDb = null;
      log('[WebDB] Database closed');
    }
  }

  async transaction(
    callback: (tx: any) => Promise<void>
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    // Create a transaction wrapper that uses the same database
    const txWrapper = {
      executeAsync: (sql: string, params: any[] = []) =>
        this.executeAsync(sql, params),
      execute: (sql: string, params: any[] = []) =>
        this.execute(sql, params),
    };

    try {
      await callback(txWrapper);
      await this.saveToIndexedDB();
    } catch (err) {
      logError('[WebDB] Transaction failed:', err as Record<string, any>);
      throw err;
    }
  }

  /**
   * Export database to binary format for download
   */
  async exportBinary(): Promise<Uint8Array> {
    if (!this.isInitialized) await this.initialize();
    if (!this.sqlDb) throw new Error('Database not initialized');
    return this.sqlDb.export();
  }

  /**
   * Import database from binary format
   */
  async importBinary(data: Uint8Array): Promise<void> {
    if (!SQL) {
      SQL = await sqlInitPromise;
    }
    this.sqlDb = new SQL.Database(data);
    this.isInitialized = true;
    await this.saveToIndexedDB();
    log('[WebDB] Database imported from file');
  }
}

// Singleton instance
let instance: WebDatabaseImpl | null = null;

export async function getWebDatabase(): Promise<WebDatabaseConnection> {
  if (!instance) {
    instance = new WebDatabaseImpl();
    await instance.initialize();
  }
  return instance;
}

export async function enqueueWebWrite(
  fn: () => Promise<void>,
  name?: string
): Promise<void> {
  return writeQueue.enqueue(fn, name);
}

export async function exportWebDatabase(): Promise<Uint8Array> {
  if (!instance) throw new Error('Database not initialized');
  return instance.exportBinary();
}

export async function importWebDatabase(data: Uint8Array): Promise<void> {
  if (!instance) {
    instance = new WebDatabaseImpl();
  }
  await instance.importBinary(data);
}

export async function clearWebDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        instance = null;
        log('[WebDB] Database cleared from IndexedDB');
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}
