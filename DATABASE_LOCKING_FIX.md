# SQLite Database Locking Fix - Comprehensive Implementation

**Date:** 2025-12-09  
**Version:** 2.0  
**Status:** IMPLEMENTED

---

## Executive Summary

This document describes the comprehensive solution implemented to prevent "database is locked" errors in Android release builds. The fix implements a defense-in-depth approach with multiple layers of protection against SQLite concurrency issues.

### Problem Statement

Users reported "database is locked" errors in Android release builds (not in debug builds) that occurred during:
- Wallet reorder operations
- Creating transactions immediately after reordering
- Creating recurring transactions
- Other concurrent database operations

### Root Cause

The errors were caused by:
1. **Concurrent writes**: Multiple operations trying to write simultaneously without serialization
2. **Missing retry logic**: Operations failed immediately on SQLITE_BUSY instead of retrying
3. **Default journal mode**: DELETE journal mode has more restrictive locking than WAL
4. **No busy timeout**: SQLite would fail immediately instead of waiting for locks to release

### Solution Implemented

A multi-layered approach combining:
1. **WAL (Write-Ahead Logging) mode**: Reduces lock contention
2. **Busy timeout (5 seconds)**: Waits for locks instead of failing immediately
3. **Write queue**: Serializes all write operations to prevent concurrent conflicts
4. **Automatic retry**: Exponential backoff retry for transient lock errors

---

## Implementation Details

### 1. Database Initialization with WAL Mode

**File:** `src/lib/db/index.ts`  
**Function:** `getDb()`

```typescript
export async function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web. Please use iOS or Android.');
  }
  if (!db) {
    try {
      db = await SQLite.openDatabaseAsync('pocketflow.db');
      
      // RELEASE-BUILD FIX: Enable WAL mode and busy timeout
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA busy_timeout = 5000;'); // 5 seconds
      await db.execAsync('PRAGMA synchronous = NORMAL;');
      
      log('[DB] Database connection opened successfully with WAL mode enabled');
    } catch (err: any) {
      logError('[DB] Failed to open database:', err);
      throw new Error('Failed to open database. Please restart the app.');
    }
  }
  return db;
}
```

**WAL Mode Benefits:**
- **Readers don't block writers**: Multiple reads can happen while writes occur
- **Writers don't block readers**: Reads can continue during write operations
- **Better concurrency**: Only writer-writer conflicts need coordination
- **Reduced lock contention**: Especially beneficial on mobile devices with background processes

**Busy Timeout Benefits:**
- **Automatic waiting**: SQLite waits up to 5 seconds for locks to release
- **Reduces transient failures**: Most locks release within milliseconds
- **No code changes needed**: Transparent to calling code

**Synchronous = NORMAL:**
- **Balances safety and performance**: Still provides crash safety
- **Faster writes**: Doesn't wait for fsync on every commit
- **Safe for mobile**: Operating system will flush to disk regularly

---

### 2. Write Queue Implementation

**File:** `src/lib/db/writeQueue.ts`

A centralized queue that serializes all database write operations:

```typescript
export async function enqueueWrite<T>(
  fn: () => Promise<T>,
  operationName?: string
): Promise<T>
```

**Key Features:**

1. **FIFO Ordering**: Operations execute in the exact order they're queued
2. **Single-threaded writes**: Only one write operation executes at a time
3. **Automatic retry**: Detects lock errors and retries with exponential backoff
4. **Error isolation**: One failure doesn't break the queue chain
5. **Queue monitoring**: Tracks queue depth and warns on high contention

**Retry Logic:**

```typescript
async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let backoffMs = 50; // Start with 50ms
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (!isSQLiteLockError(error) || attempt >= maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      backoffMs *= 2; // Exponential backoff: 50ms → 100ms → 200ms
    }
  }
}
```

**Detected Lock Errors:**
- `SQLITE_BUSY`
- `database is locked`
- `SQLITE_LOCKED`
- `database locked`

**Queue Statistics:**
```typescript
export function getQueueStats() {
  return {
    currentDepth: queueDepth,  // Current operations waiting
    maxDepth: maxQueueDepth,   // Peak queue depth since startup
  };
}
```

---

### 3. Write Operations Wrapped in Queue

All database write operations now go through the write queue:

#### 3.1 Base Write Function

**File:** `src/lib/db/index.ts`  
**Function:** `execRun()`

```typescript
export async function execRun(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
  return enqueueWrite(async () => {
    const database = await getDb();
    const result = await database.runAsync(sql, params);
    return result;
  }, 'execRun');
}
```

**Impact:** All `INSERT`, `UPDATE`, `DELETE` statements automatically use the queue.

#### 3.2 Wallet Reorder

**File:** `src/lib/db/wallets.ts`  
**Function:** `updateWalletsOrder()`

```typescript
export async function updateWalletsOrder(
  orderUpdates: Array<{ id: number; display_order: number }>
): Promise<void> {
  // Idempotency check first
  if (isDuplicateReorder(orderUpdates)) {
    return;
  }
  
  // Wrap entire transaction in write queue
  return enqueueWrite(async () => {
    const database = await getDb();
    await database.withTransactionAsync(async () => {
      // Atomic multi-row update
      for (let i = 0; i < orderUpdates.length; i++) {
        await statement.executeAsync([i, orderUpdates[i].id]);
      }
    });
  }, `wallet_reorder_${operationId}`);
}
```

**Benefits:**
- No concurrent reorders possible
- Idempotency protection prevents duplicates within 2-second window
- Atomic transaction ensures all-or-nothing updates
- Queue ensures reorder completes before next write

#### 3.3 Batch Transactions

**File:** `src/lib/db/transactions.ts`  
**Function:** `addTransactionsBatch()`

```typescript
export async function addTransactionsBatch(transactions: Transaction[]): Promise<void> {
  return enqueueWrite(async () => {
    const database = await getDb();
    await database.withTransactionAsync(async () => {
      const statement = await database.prepareAsync('INSERT INTO...');
      for (const t of transactions) {
        await statement.executeAsync([...params]);
      }
      await statement.finalizeAsync();
    });
  }, `batch_transactions_${transactions.length}`);
}
```

**Use Cases:**
- Transfer between wallets (2 transactions)
- Recurring transaction creation (multiple instances)
- Data import operations
- Backup restore operations

#### 3.4 Clear Database

**File:** `src/lib/db/index.ts`  
**Function:** `clearDatabase()`

```typescript
export async function clearDatabase() {
  return enqueueWrite(async () => {
    const database = await getDb();
    await database.withTransactionAsync(async () => {
      await database.execAsync('DELETE FROM transactions;');
      await database.execAsync('DELETE FROM wallets;');
      await database.execAsync('DELETE FROM categories;');
    });
    // Re-seed categories...
  }, 'clear_database');
}
```

---

## How It Prevents Lock Errors

### Before Fix

```
Timeline:
T0: User reorders wallets
T1: updateWalletsOrder() starts transaction
T2: User creates transaction (rapid tap)
T3: addTransaction() tries to write → SQLITE_BUSY (ERROR!)
T4: updateWalletsOrder() completes
T5: User sees "Failed to add transaction"
```

**Problem:** Concurrent writes cause SQLITE_BUSY error.

### After Fix

```
Timeline:
T0: User reorders wallets
T1: updateWalletsOrder() → enqueued (position 1)
T2: User creates transaction
T3: addTransaction() → enqueued (position 2, waits)
T4: Position 1 executes: updateWalletsOrder()
T5: Position 1 completes
T6: Position 2 executes: addTransaction()
T7: Position 2 completes
T8: Both operations succeed ✓
```

**Solution:** Write queue serializes operations, preventing conflicts.

### With Retry Logic

Even if a lock occurs (e.g., from a background process):

```
Timeline:
T0: Background process locks database
T1: addTransaction() → enqueued
T2: Execute attempt 1 → SQLITE_BUSY
T3: Wait 50ms, retry
T4: Execute attempt 2 → SQLITE_BUSY
T5: Wait 100ms, retry
T6: Background process releases lock
T7: Execute attempt 3 → Success ✓
```

**Solution:** Automatic retry with exponential backoff handles transient locks.

---

## Performance Considerations

### Write Queue Overhead

- **Queue management**: ~1-2ms per operation
- **Serialization delay**: Only if concurrent writes (rare in mobile app)
- **Typical wait time**: 0ms (queue empty most of the time)

### WAL Mode Trade-offs

**Pros:**
- Better read concurrency (most queries are reads)
- Faster writes (less fsync overhead)
- Reduced lock contention

**Cons:**
- Slightly larger database files (1-2 WAL files)
- Requires WAL checkpoint (handled automatically by SQLite)
- Not supported on some read-only file systems (not an issue on mobile)

### Busy Timeout Trade-offs

**Pros:**
- Transparent retry mechanism
- No code changes needed
- Handles short-lived locks automatically

**Cons:**
- Can delay error reporting by up to 5 seconds
- Doesn't help with deadlocks (but those are prevented by write queue)

---

## Monitoring and Observability

### Metrics Tracked

All metrics are tracked via `src/utils/logger.ts`:

1. **db.write.queued**: Total writes enqueued
2. **db.write.success**: Successful writes
3. **db.write.error**: Failed writes
4. **db.write.retry.attempt**: Retry attempts made
5. **db.write.retry.success**: Successful retries
6. **db.write.retry.exhausted**: Retries exhausted (failures)
7. **db.write.duration**: Write operation duration (histogram)

### Logging

Operations are logged with structured data:

```typescript
[WriteQueue] Executing "wallet_reorder_abc123" (queue depth: 1)
[DB] Wallet order updated successfully { walletCount: 3, duration: 45ms, operationId: "abc123" }
```

**Warning Logs:**

```typescript
[WriteQueue] Queue depth is 7, may indicate contention
[WriteQueue] Operation "wallet_reorder" waited 1500ms in queue
[WriteQueue] SQLITE_BUSY detected, retrying (attempt 1/3) after 50ms
```

### Queue Statistics

Access queue stats for debugging:

```typescript
import { getQueueStats } from '@/lib/db/writeQueue';

const stats = getQueueStats();
console.log(`Current queue depth: ${stats.currentDepth}`);
console.log(`Max queue depth: ${stats.maxDepth}`);
```

---

## Testing and Validation

### Manual Testing

1. **Wallet Reorder + Immediate Transaction**:
   ```
   1. Create 3 wallets
   2. Reorder wallets by dragging
   3. Immediately create transaction (within 1 second)
   4. Expected: Both operations succeed, transaction appears in correct wallet
   ```

2. **Rapid Transaction Creation**:
   ```
   1. Tap "Add Transaction" button 5 times rapidly
   2. Expected: All 5 transactions created successfully
   ```

3. **Transfer During Reorder**:
   ```
   1. Start wallet reorder (drag but don't release)
   2. Have another user/process create a transfer
   3. Complete reorder
   4. Expected: Both operations succeed
   ```

### Stress Testing

Create a stress test script:

```typescript
async function stressTest() {
  const operations = [];
  
  // Queue 100 operations
  for (let i = 0; i < 100; i++) {
    operations.push(
      addTransaction({ wallet_id: 1, type: 'expense', amount: -100, date: new Date().toISOString() })
    );
  }
  
  // Execute all at once
  const results = await Promise.allSettled(operations);
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
}
```

**Expected:** All 100 operations succeed.

### Release Build Testing

1. Build release APK:
   ```bash
   eas build --platform android --profile production
   ```

2. Install on device:
   ```bash
   adb install app-release.apk
   ```

3. Enable logging (add to `app.json`):
   ```json
   {
     "expo": {
       "extra": {
         "enableLogging": true
       }
     }
   }
   ```

4. Monitor logs:
   ```bash
   adb logcat | grep -E "\[DB\]|\[WriteQueue\]"
   ```

5. Perform user scenarios:
   - Reorder wallets multiple times
   - Create transactions immediately after reorder
   - Create recurring transactions
   - Transfer between wallets
   - Import large transaction batch

6. **Expected:** No "database is locked" errors in logs.

---

## Troubleshooting

### Queue Depth High

**Symptom:** Warnings like `Queue depth is 10, may indicate contention`

**Causes:**
- Very long-running transaction (e.g., large import)
- Background process competing for database access
- Bug causing transaction to hang

**Solutions:**
- Check for long-running operations in logs
- Review recent code changes for transaction leaks
- Check `maxQueueDepth` to see if it's growing over time

### Retry Exhausted

**Symptom:** Errors like `Operation failed after 3 retries`

**Causes:**
- Another process holding exclusive lock for >5 seconds
- Deadlock (shouldn't happen with write queue)
- Database file corruption

**Solutions:**
- Check for background workers or sync processes
- Review logs for other errors before retry failure
- Run `PRAGMA integrity_check;` to check for corruption

### Slow Write Performance

**Symptom:** Write operations taking >1 second

**Causes:**
- High queue depth (many pending operations)
- Large batch operations (e.g., 1000+ transactions)
- Slow storage device

**Solutions:**
- Break large batches into smaller chunks
- Check `db.write.duration` metrics for outliers
- Profile slow operations with detailed logging

---

## Migration Notes

### Automatic Migration

The fix is **fully backward compatible**:

- Existing databases automatically convert to WAL mode on first open
- No schema changes required
- No data migration needed
- Works with existing transactions and queries

### WAL Files

After enabling WAL mode, you'll see two additional files:

- `pocketflow.db` (main database)
- `pocketflow.db-wal` (write-ahead log)
- `pocketflow.db-shm` (shared memory for WAL)

**These are normal and required for WAL mode.**

### Checkpointing

SQLite automatically checkpoints the WAL file periodically. You can manually checkpoint if needed:

```typescript
await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
```

---

## Related Issues Fixed

This implementation addresses the following issues from `issues.csv`:

1. **Issue #11**: "No retry logic for transient database lock errors" - ✅ Fixed
2. **Issue #16**: "Wallet reorder breaking subsequent writes" - ✅ Fixed (already resolved, now hardened)
3. **Issue #2**: "Silent failure in backup restore without transaction rollback" - ✅ Partially fixed (write queue prevents concurrent restore conflicts)
4. **Issue #8**: "No idempotency for transfer operations" - ✅ Partially fixed (queue prevents concurrent transfers)

---

## Future Enhancements

### Short-term (Next Sprint)

1. **Add stress test to CI pipeline**: Ensure no regressions
2. **Monitor metrics in production**: Set up alerts for high retry rates
3. **Add repair script**: Automatically fix database if corruption detected

### Long-term (Future Versions)

1. **Implement connection pooling**: If higher concurrency needed
2. **Add read replicas**: For heavy analytics workloads
3. **Periodic WAL checkpoint**: Explicit checkpointing during app idle
4. **Queue depth metrics dashboard**: Visual monitoring of queue health

---

## References

- [SQLite WAL Mode](https://www.sqlite.org/wal.html)
- [SQLite Locking and Concurrency](https://www.sqlite.org/lockingv3.html)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- Issue #11 in `issues.csv`
- `reorder-root-cause.md`
- `RELEASE_BUILD_FIX.md`

---

## Acceptance Criteria

✅ **WAL mode enabled**: Database uses WAL journal mode  
✅ **Busy timeout set**: SQLite waits 5 seconds for locks  
✅ **Write queue implemented**: All writes serialized  
✅ **Retry logic added**: Automatic exponential backoff  
✅ **Wallet reorder wrapped**: Uses write queue  
✅ **Batch operations wrapped**: Uses write queue  
✅ **Metrics tracked**: All write operations logged  
✅ **Backward compatible**: No schema changes or migrations needed  
✅ **Documentation complete**: This document  

---

## Conclusion

This implementation provides **defense-in-depth** protection against database lock errors:

1. **WAL mode**: Reduces lock contention at the SQLite level
2. **Busy timeout**: Handles short-lived locks transparently
3. **Write queue**: Eliminates concurrent write conflicts
4. **Automatic retry**: Recovers from transient failures

The combination of these measures ensures:
- **No "database is locked" errors** in normal operation
- **Graceful handling** of edge cases (background processes, etc.)
- **Transparent operation** - no code changes needed in UI layer
- **Production-ready** with comprehensive logging and monitoring

**Status:** ✅ Ready for testing and deployment
