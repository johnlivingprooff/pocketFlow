/**
 * Write Queue - Serializes all database write operations
 * 
 * This module ensures that all database writes execute sequentially in a FIFO queue,
 * preventing concurrent writes that could cause SQLITE_BUSY or "database is locked" errors.
 * 
 * Key features:
 * - Single write queue per application instance
 * - FIFO ordering guarantees writes execute in order
 * - Error isolation: one failure doesn't stop the queue
 * - Automatic retry with exponential backoff for lock errors
 * - Metrics and logging for observability
 * 
 * Architecture:
 * The queue is implemented as a promise chain stored in `queueTail`. Each new operation
 * is appended to the tail, ensuring FIFO execution. This pattern ensures that:
 * 1. Operations execute in the order they were enqueued
 * 2. Only one operation executes at a time (no concurrent writes)
 * 3. Failed operations don't break the queue chain
 * 
 * Usage:
 * ```typescript
 * import { enqueueWrite } from './writeQueue';
 * 
 * await enqueueWrite(async () => {
 *   await db.runAsync('INSERT INTO wallets ...', params);
 * });
 * ```
 */

import { log, warn, error as logError, metrics } from '../../utils/logger';

// Global write queue - ensures single-threaded write execution
// This promise chain represents the tail of the queue. Each new operation
// is appended to this chain, guaranteeing FIFO ordering and preventing
// concurrent write operations that could cause SQLITE_BUSY errors.
let queueTail: Promise<void> = Promise.resolve();

// Queue depth tracking for monitoring
let queueDepth = 0;
let maxQueueDepth = 0;

/**
 * Check if an error is a SQLite lock/busy error that should be retried
 */
function isSQLiteLockError(error: any): boolean {
  // Check structured error properties first
  if (error.code) {
    const code = String(error.code).toUpperCase();
    if (code.includes('SQLITE_BUSY') || code.includes('SQLITE_LOCKED')) {
      return true;
    }
  }
  
  // Check error message
  const message = error.message || String(error);
  const messageLower = message.toLowerCase();
  return (
    messageLower.includes('sqlite_busy') ||
    messageLower.includes('database is locked') ||
    messageLower.includes('sqlite_locked') ||
    messageLower.includes('database locked')
  );
}

/**
 * Execute a function with exponential backoff retry logic for lock errors
 * @param fn - Async function to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of the function
 */
async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: any;
  let backoffMs = 50; // Start with 50ms
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      // Log successful retry
      if (attempt > 0) {
        log(`[WriteQueue] Operation succeeded after ${attempt} retries`);
        metrics.increment('db.write.retry.success');
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Only retry on lock errors
      if (!isSQLiteLockError(error)) {
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break;
      }
      
      // Log retry attempt
      warn(`[WriteQueue] SQLITE_BUSY detected, retrying (attempt ${attempt + 1}/${maxRetries}) after ${backoffMs}ms`);
      metrics.increment('db.write.retry.attempt');
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      backoffMs *= 2; // Double the backoff time
    }
  }
  
  // All retries exhausted
  logError(`[WriteQueue] Operation failed after ${maxRetries} retries`, lastError);
  metrics.increment('db.write.retry.exhausted');
  throw lastError;
}

/**
 * Enqueue a database write operation
 * 
 * All writes are serialized through a single FIFO queue to prevent concurrent
 * writes that could cause database lock errors. Each write is automatically
 * retried with exponential backoff if it encounters a lock error.
 * 
 * @param fn - Async function that performs database writes
 * @param operationName - Optional name for logging/debugging
 * @returns Promise that resolves when the write completes
 */
export async function enqueueWrite<T>(
  fn: () => Promise<T>,
  operationName?: string
): Promise<T> {
  const startTime = Date.now();
  queueDepth++;
  maxQueueDepth = Math.max(maxQueueDepth, queueDepth);
  
  // Log queue metrics
  if (queueDepth > 5) {
    warn(`[WriteQueue] Queue depth is ${queueDepth}, may indicate contention`);
  }
  
  // Chain this operation to the end of the queue
  const operationPromise = queueTail.then(async () => {
    try {
      const queueWaitTime = Date.now() - startTime;
      if (queueWaitTime > 1000) {
        warn(`[WriteQueue] Operation "${operationName || 'unknown'}" waited ${queueWaitTime}ms in queue`);
      }
      
      log(`[WriteQueue] Executing "${operationName || 'write'}" (queue depth: ${queueDepth})`);
      metrics.increment('db.write.queued');
      
      // Execute with retry logic
      const result = await executeWithRetry(fn);
      
      const totalTime = Date.now() - startTime;
      log(`[WriteQueue] Completed "${operationName || 'write'}" in ${totalTime}ms`);
      metrics.timing('db.write.duration', totalTime);
      metrics.increment('db.write.success');
      
      return result;
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      logError(`[WriteQueue] Failed "${operationName || 'write'}" after ${totalTime}ms`, error);
      metrics.increment('db.write.error');
      throw error;
    } finally {
      queueDepth--;
    }
  });
  
  // Update queue tail
  // This catch handler prevents unhandled promise rejections from breaking the queue chain.
  // Errors are still properly propagated to the caller via operationPromise, but we need
  // to catch them in the queue chain to ensure subsequent operations can still execute.
  // Without this, one failed operation would prevent all future operations from running.
  queueTail = operationPromise.catch(() => {
    // Intentionally swallow errors here to maintain queue chain continuity.
    // The original error is still propagated to the caller via operationPromise.
    // This empty handler is necessary for queue integrity.
    return; // Explicit return for clarity
  });
  
  return operationPromise;
}

/**
 * Get current queue statistics for monitoring/debugging
 */
export function getQueueStats() {
  return {
    currentDepth: queueDepth,
    maxDepth: maxQueueDepth,
  };
}

/**
 * Reset queue statistics (for testing)
 */
export function resetQueueStats() {
  maxQueueDepth = 0;
}
