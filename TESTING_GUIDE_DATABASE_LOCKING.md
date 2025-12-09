# SQLite Locking Fix - Testing and Validation Guide

## Overview

This document provides comprehensive testing instructions for validating the SQLite database locking fix implemented to prevent "database is locked" errors in Android release builds.

## Quick Start Testing

### Prerequisite: Build Release APK

```bash
# Build production release APK
eas build --platform android --profile production

# Or build locally if configured
cd android && ./gradlew assembleRelease

# Install on device
adb install -r app/build/outputs/apk/release/app-release.apk
```

### Enable Logging (Optional but Recommended)

Add to `app.json` before building:

```json
{
  "expo": {
    "extra": {
      "enableLogging": true
    }
  }
}
```

Then rebuild and monitor logs:

```bash
adb logcat | grep -E "\[DB\]|\[WriteQueue\]|\[RELEASE_DEBUG\]"
```

---

## Test Suite

### Test 1: Wallet Reorder + Immediate Transaction ⭐ **CRITICAL**

**Purpose:** Verify the primary issue is fixed - concurrent write operations don't cause lock errors.

**Steps:**
1. Open the app
2. Navigate to Wallets screen
3. Create 3 wallets if they don't exist:
   - Wallet A: Cash, $1000
   - Wallet B: Bank, $2000
   - Wallet C: Savings, $3000
4. Reorder wallets by dragging Wallet C to position 1
5. **Immediately** (within 1 second) tap "Add Transaction"
6. Create a transaction: Expense, $50, Food category
7. Tap Save

**Expected Result:**
- ✅ Wallet reorder completes successfully
- ✅ Transaction is created without error
- ✅ Transaction appears in the correct wallet
- ✅ No "database is locked" error
- ✅ No app crash or freeze

**Log Verification:**
```
[WriteQueue] Executing "wallet_reorder_..." (queue depth: 1)
[DB] Wallet order updated successfully { walletCount: 3, duration: 45ms }
[WriteQueue] Executing "execRun" (queue depth: 1)
[DB] Transaction added in 23ms
```

**Failure Indicators:**
- ❌ Error message "Failed to add transaction"
- ❌ Transaction not visible after save
- ❌ App freezes or crashes
- ❌ Log shows "SQLITE_BUSY" or "database is locked"

---

### Test 2: Rapid Transaction Creation

**Purpose:** Verify write queue handles multiple rapid writes without conflicts.

**Steps:**
1. Navigate to Home screen
2. Tap "Add Transaction" button 5 times rapidly (as fast as possible)
3. For each transaction:
   - Type: Expense
   - Amount: $10
   - Category: Food
   - Tap Save immediately
4. Wait 2 seconds
5. Pull to refresh the transaction list

**Expected Result:**
- ✅ All 5 transactions created successfully
- ✅ All transactions visible in the list
- ✅ No duplicate transactions
- ✅ No errors during creation

**Log Verification:**
```
[WriteQueue] Executing "execRun" (queue depth: 1)
[WriteQueue] Executing "execRun" (queue depth: 2)
[WriteQueue] Executing "execRun" (queue depth: 3)
... (all complete successfully)
```

---

### Test 3: Transfer Between Wallets During Reorder

**Purpose:** Verify batch transaction operations (transfers) don't conflict with reorder.

**Steps:**
1. Ensure you have at least 2 wallets with balance
2. Start dragging Wallet A to reorder (drag but **don't release yet**)
3. Have another person/device create a transfer:
   - From: Wallet A → To: Wallet B
   - Amount: $100
   OR use a timer:
   - Start timer for 2 seconds
   - Start dragging wallet
   - After 2 seconds (while still dragging), use another device to create transfer
4. Complete the drag to reorder
5. Verify both operations completed

**Expected Result:**
- ✅ Wallet reorder completes
- ✅ Transfer completes (2 transactions created)
- ✅ Balances updated correctly
- ✅ No errors

**Note:** This test requires coordination or automation. Can be skipped for manual testing.

---

### Test 4: Create Recurring Transaction

**Purpose:** Verify recurring transaction creation (batch operation) works correctly.

**Steps:**
1. Navigate to Home screen
2. Tap "Add Transaction"
3. Create a recurring transaction:
   - Type: Expense
   - Amount: $50
   - Category: Rent
   - Frequency: Monthly
   - Start date: Today
   - End date: 6 months from now
4. Tap Save
5. Wait for processing
6. Check that recurring instances are generated

**Expected Result:**
- ✅ Parent transaction created
- ✅ Future instances generated (up to 6)
- ✅ No "database is locked" errors
- ✅ All instances visible in transaction list

**Log Verification:**
```
[WriteQueue] Executing "batch_transactions_6" (queue depth: 1)
[DB] Transaction added in ...ms
```

---

### Test 5: Background/Foreground Transition

**Purpose:** Verify database remains stable across app state changes.

**Steps:**
1. Create a transaction
2. Press Home button (send app to background)
3. Wait 5 seconds
4. Open another app
5. Return to pocketFlow (via recent apps)
6. Create another transaction
7. Reorder wallets
8. Create another transaction immediately after reorder

**Expected Result:**
- ✅ All operations complete successfully
- ✅ No errors after returning from background
- ✅ Data persists correctly

---

### Test 6: Import Large Dataset

**Purpose:** Verify batch operations handle large datasets without timeout.

**Steps:**
1. Navigate to Settings → Export/Import
2. Create a backup if needed
3. Restore from backup (or import a large dataset)
4. Wait for import to complete

**Expected Result:**
- ✅ Import completes without errors
- ✅ All data imported correctly
- ✅ No timeout errors
- ✅ App remains responsive

**Log Verification:**
```
[WriteQueue] Executing "batch_transactions_100" (queue depth: 1)
[DB] Transaction added in ...ms (should complete within 5 seconds)
```

---

### Test 7: Stress Test (Automated)

**Purpose:** Verify system handles high concurrent load without lock errors.

**Implementation:**

Create a test file `tests/stress-test.ts`:

```typescript
import { addTransaction } from '@/lib/db/transactions';
import { updateWalletsOrder } from '@/lib/db/wallets';
import { getQueueStats } from '@/lib/db/writeQueue';

async function stressTest() {
  console.log('Starting stress test...');
  const startTime = Date.now();
  
  // Create 50 transactions concurrently
  const transactionOps = Array.from({ length: 50 }, (_, i) => 
    addTransaction({
      wallet_id: 1,
      type: 'expense',
      amount: -(i + 1),
      category: 'Food',
      date: new Date().toISOString(),
    })
  );
  
  // Create 10 wallet reorder operations concurrently
  const reorderOps = Array.from({ length: 10 }, () =>
    updateWalletsOrder([
      { id: 1, display_order: 0 },
      { id: 2, display_order: 1 },
      { id: 3, display_order: 2 },
    ])
  );
  
  // Execute all at once
  const results = await Promise.allSettled([...transactionOps, ...reorderOps]);
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  const duration = Date.now() - startTime;
  const stats = getQueueStats();
  
  console.log('Stress test results:', {
    total: results.length,
    succeeded,
    failed,
    duration: `${duration}ms`,
    maxQueueDepth: stats.maxDepth,
  });
  
  // Assert all operations succeeded
  if (failed > 0) {
    console.error('STRESS TEST FAILED:', failed, 'operations failed');
    const failedResults = results.filter(r => r.status === 'rejected');
    failedResults.forEach((r: any) => console.error(r.reason));
  } else {
    console.log('✅ STRESS TEST PASSED: All operations succeeded');
  }
}

// Run test
stressTest().catch(console.error);
```

**Expected Result:**
- ✅ All 60 operations succeed
- ✅ No lock errors
- ✅ Completes within reasonable time (<30 seconds)
- ✅ maxQueueDepth < 20 (indicates queue processes efficiently)

---

## Validation Checklist

### Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] WAL mode enabled in database initialization
- [ ] Busy timeout set to 5000ms
- [ ] All write operations use `enqueueWrite` or `execRun`
- [ ] Wallet reorder wrapped in write queue
- [ ] Batch transaction operations wrapped in write queue
- [ ] Clear database operation wrapped in write queue
- [ ] TypeScript compiles without errors
- [ ] No new ESLint warnings related to database operations

### Manual Testing Checklist

Complete all critical tests:

- [ ] Test 1: Wallet Reorder + Immediate Transaction (CRITICAL)
- [ ] Test 2: Rapid Transaction Creation
- [ ] Test 4: Create Recurring Transaction
- [ ] Test 5: Background/Foreground Transition
- [ ] Test 6: Import Large Dataset

### Release Build Checklist

For release builds:

- [ ] Build release APK with production flags
- [ ] Install on physical Android device (not emulator)
- [ ] Test on Android version matching production (9+)
- [ ] Enable logging and monitor for errors
- [ ] Run all manual tests on release build
- [ ] Check for any "database is locked" errors in logs
- [ ] Verify no performance degradation

### Automated Testing Checklist

- [ ] Stress test passes (all 60 operations succeed)
- [ ] Queue depth stays reasonable (<20)
- [ ] No memory leaks detected
- [ ] Average operation time <100ms
- [ ] No operations timeout (>5 seconds)

---

## Performance Benchmarks

### Expected Performance

| Operation | Expected Time | Max Acceptable Time |
|-----------|---------------|---------------------|
| Single transaction | 10-50ms | 200ms |
| Wallet reorder (3 wallets) | 20-80ms | 300ms |
| Batch 10 transactions | 50-200ms | 1000ms |
| Batch 100 transactions | 500-2000ms | 5000ms |
| Clear database | 100-500ms | 2000ms |

### Queue Metrics

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Current queue depth | 0-2 | 3-5 | >5 |
| Max queue depth | 0-5 | 6-10 | >10 |
| Retry rate | <1% | 1-5% | >5% |
| Failed operations | 0% | <0.1% | >0.1% |

---

## Debugging Failed Tests

### "Database is locked" Still Occurs

**Possible Causes:**
1. Background process not using write queue
2. Native module bypassing queue
3. Very long transaction (>5 seconds)

**Debug Steps:**
1. Check logs for operation that failed
2. Verify operation uses `enqueueWrite`
3. Check queue depth at time of failure
4. Look for long-running operations before failure

### High Queue Depth

**Possible Causes:**
1. Very slow operations blocking queue
2. Large batch operation
3. Bug in queue implementation

**Debug Steps:**
1. Check `db.write.duration` metrics
2. Look for operations taking >1 second
3. Review queue stats: `getQueueStats()`
4. Check for operations that never complete

### Retry Exhausted

**Possible Causes:**
1. Another process holding lock for >5 seconds
2. Corrupted database
3. Bug in transaction logic

**Debug Steps:**
1. Check for background workers
2. Run `PRAGMA integrity_check;`
3. Review logs for errors before retry
4. Check if issue occurs on specific devices only

---

## Rollback Plan

If critical issues are found:

1. **Immediate Mitigation:**
   - Revert to previous version
   - Disable problematic feature if isolated

2. **Investigation:**
   - Collect logs from affected devices
   - Reproduce issue in development
   - Identify root cause

3. **Fix:**
   - Address specific issue
   - Re-run test suite
   - Deploy fix incrementally (canary → beta → production)

---

## Success Criteria

The fix is considered successful if:

✅ **Zero "database is locked" errors** in Test 1-7  
✅ **All stress test operations succeed** (60/60)  
✅ **Queue depth stays healthy** (<10 max)  
✅ **Performance within acceptable range**  
✅ **No regressions** in existing functionality  
✅ **Release build matches debug build behavior**  
✅ **Logs show correct queue operation**  

---

## Contact and Support

If you encounter issues during testing:

1. Capture full logs: `adb logcat > test-failure.log`
2. Document exact steps to reproduce
3. Note device details (Android version, model, etc.)
4. Report issue with logs attached

---

## Conclusion

This comprehensive test suite validates:
- Write queue serialization prevents concurrent conflicts
- WAL mode + busy timeout handles transient locks
- Automatic retry recovers from temporary failures
- System performs well under stress
- Release builds match debug build behavior

**All tests must pass before deploying to production.**
