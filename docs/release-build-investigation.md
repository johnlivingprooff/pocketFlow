# Release-Build Specific Investigation - Wallet Reorder & Database Issues

**Date:** 2025-12-09  
**Status:** IN PROGRESS  
**Issue:** Wallet reorder and recurring transactions cause database write failures **only in release builds**

---

## Tech Stack Detection

### Environment
- **Framework:** React Native with Expo SDK 54
- **Database:** expo-sqlite 16.0.9 (SQLite with async API)
- **JS Engine:** Hermes (default for Expo production builds since SDK 48+)
- **Build System:** EAS Build
- **Package:** com.eiteone.pocketflow
- **Node Version:** v20.19.6

### Build Profiles (from eas.json)
1. **Development:** APK with development client, internal distribution
2. **Preview:** APK, internal distribution
3. **Production:** AAB (App Bundle) with auto-increment, production distribution

### Key Observations
- Expo uses **Hermes by default in production builds** (since SDK 48+)
- Debug builds may use JSC (JavaScriptCore) or Hermes depending on configuration
- Production builds undergo:
  - Metro bundler minification
  - Hermes bytecode compilation
  - Native code optimization (R8 on Android)

---

## Hypothesis: Release-Specific Failure Causes

### Primary Suspects

#### 1. Hermes Engine Differences (HIGH PRIORITY)
**Why:** Hermes has different behavior than JSC for:
- Object property enumeration order
- Date/time precision
- Number handling (especially with SQLite integers)
- String interning
- Promise scheduling

**Investigation Required:**
- Test if `display_order` calculations differ in Hermes
- Check if Date.now() precision causes issues in `generateOperationId()`
- Verify SQLite number type handling (INTEGER vs REAL)

#### 2. Metro Bundler Minification (HIGH PRIORITY)
**Why:** Production bundles are minified, which can:
- Rename object keys used in database operations
- Remove property names that reflection/serialization depends on
- Change evaluation order of expressions

**Investigation Required:**
- Check if wallet/transaction objects have properties that get minified
- Verify database column names aren't derived from minified keys
- Test if `display_order` field name is preserved

#### 3. expo-sqlite Native Module Behavior (MEDIUM PRIORITY)
**Why:** Native modules can have different behavior in release:
- Different thread scheduling
- Transaction isolation differences
- Connection pooling variations

**Investigation Required:**
- Test transaction atomicity in release builds
- Verify prepared statement lifecycle
- Check if concurrent operations behave differently

#### 4. Timing & Race Conditions (MEDIUM PRIORITY)
**Why:** Release builds are optimized:
- JIT optimization changes timing
- Promise resolution order may differ
- Background task scheduling varies

**Investigation Required:**
- Test rapid wallet reorder operations
- Check concurrent database access patterns
- Verify idempotency window (2-second) effectiveness

#### 5. Error Handling & Logging (LOW PRIORITY)
**Why:** Production may suppress errors:
- Console.log statements removed
- Error boundaries behave differently
- Stack traces may be incomplete

---

## Reproduction Strategy

### Phase 1: Local Release Build Testing

#### Build Commands
```bash
# Install EAS CLI if not present
npm install -g eas-cli

# Build a debuggable release locally (production configuration but debuggable)
eas build --platform android --profile production --local

# Or build with preview profile for faster iteration
eas build --platform android --profile preview --local
```

#### Alternative: Development Build with Release Optimizations
```bash
# Add to app.json temporarily
{
  "expo": {
    "android": {
      "jsEngine": "hermes", // Force Hermes
      "enableDangerousExperimentalLeanBuilds": true
    }
  }
}

# Then build
npx expo run:android --variant release
```

### Phase 2: Instrumentation for Release Builds

#### Enable Verbose Logging in Release
```typescript
// src/utils/logger.ts - Add environment-based logging
const FORCE_LOGGING = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_LOGGING === 'true';

export function log(message: string, context?: Record<string, any>, operationId?: string): void {
  if (FORCE_LOGGING) {
    // ... existing log implementation
  }
}
```

#### Add Release-Specific Breadcrumbs
```typescript
// src/lib/db/wallets.ts - Add detailed logging for release debugging
export async function updateWalletsOrder(orderUpdates: Array<{ id: number; display_order: number }>): Promise<void> {
  const operationId = generateOperationId();
  const startTime = Date.now();
  
  // RELEASE DEBUG: Log input state
  console.log('[RELEASE_DEBUG] Reorder input:', JSON.stringify({
    operationId,
    updateCount: orderUpdates.length,
    updates: orderUpdates,
    timestamp: new Date().toISOString(),
    engine: typeof HermesInternal !== 'undefined' ? 'Hermes' : 'JSC'
  }));
  
  // ... existing implementation
}
```

### Phase 3: Database State Capture

#### Pre-Reorder Snapshot Script
```typescript
// scripts/capture-db-state.ts
import * as SQLite from 'expo-sqlite';

async function captureState() {
  const db = await SQLite.openDatabaseAsync('pocketflow.db');
  
  // Capture all wallets
  const wallets = await db.getAllAsync('SELECT * FROM wallets ORDER BY id;');
  console.log('[DB_SNAPSHOT] Wallets:', JSON.stringify(wallets, null, 2));
  
  // Check for display_order issues
  const orderCheck = await db.getAllAsync(`
    SELECT 
      display_order, 
      COUNT(*) as count,
      GROUP_CONCAT(id) as wallet_ids
    FROM wallets 
    GROUP BY display_order 
    HAVING count > 1;
  `);
  console.log('[DB_SNAPSHOT] Duplicate display_orders:', JSON.stringify(orderCheck, null, 2));
  
  // Check sequence
  const sequenceCheck = await db.getAllAsync(`
    SELECT 
      id,
      display_order,
      CASE 
        WHEN display_order IS NULL THEN 'NULL'
        WHEN display_order < 0 THEN 'NEGATIVE'
        ELSE 'OK'
      END as status
    FROM wallets
    WHERE display_order IS NULL OR display_order < 0;
  `);
  console.log('[DB_SNAPSHOT] Invalid display_orders:', JSON.stringify(sequenceCheck, null, 2));
}
```

---

## Test Cases for Release Builds

### Test 1: Basic Reorder in Release
```typescript
// tests/release/reorder-release.test.ts
describe('Wallet Reorder - Release Build', () => {
  it('should handle reorder in Hermes environment', async () => {
    // Check if running in Hermes
    const isHermes = typeof HermesInternal !== 'undefined';
    console.log('[TEST] Running in:', isHermes ? 'Hermes' : 'JSC');
    
    // Create 3 wallets
    await createWallet({ name: 'A', currency: 'USD', initial_balance: 100, type: 'cash' });
    await createWallet({ name: 'B', currency: 'USD', initial_balance: 200, type: 'bank' });
    await createWallet({ name: 'C', currency: 'USD', initial_balance: 300, type: 'card' });
    
    // Get wallets
    let wallets = await getWallets();
    expect(wallets).toHaveLength(3);
    
    // Reorder: C, A, B
    await updateWalletsOrder([
      { id: wallets[2].id!, display_order: 0 },
      { id: wallets[0].id!, display_order: 1 },
      { id: wallets[1].id!, display_order: 2 },
    ]);
    
    // Verify order persists
    wallets = await getWallets();
    expect(wallets[0].name).toBe('C');
    expect(wallets[1].name).toBe('A');
    expect(wallets[2].name).toBe('B');
    
    // Critical: Try to create a new wallet after reorder
    await createWallet({ name: 'D', currency: 'USD', initial_balance: 400, type: 'cash' });
    
    wallets = await getWallets();
    expect(wallets).toHaveLength(4);
    expect(wallets[3].name).toBe('D');
  });
});
```

### Test 2: Number Type Handling in Hermes
```typescript
describe('Number Handling - Hermes vs JSC', () => {
  it('should handle display_order as proper integer', async () => {
    // In Hermes, numbers can behave differently
    const count = 3;
    const nextOrder = count; // Should be integer
    
    // Verify type before DB write
    expect(Number.isInteger(nextOrder)).toBe(true);
    expect(typeof nextOrder).toBe('number');
    
    // Create wallet with this order
    await createWallet({ 
      name: 'Test', 
      currency: 'USD', 
      initial_balance: 100, 
      type: 'cash' 
    });
    
    const wallets = await getWallets();
    const lastWallet = wallets[wallets.length - 1];
    
    // Verify display_order is integer in DB
    expect(Number.isInteger(lastWallet.display_order)).toBe(true);
    expect(lastWallet.display_order).toBe(count);
  });
});
```

### Test 3: Transaction Atomicity in Release
```typescript
describe('Transaction Atomicity - Release Mode', () => {
  it('should maintain atomicity under concurrent load', async () => {
    // Create 5 wallets
    for (let i = 0; i < 5; i++) {
      await createWallet({ 
        name: `Wallet ${i}`, 
        currency: 'USD', 
        initial_balance: 100, 
        type: 'cash' 
      });
    }
    
    // Perform 10 rapid reorders concurrently
    const reorderPromises = [];
    for (let i = 0; i < 10; i++) {
      const wallets = await getWallets();
      const shuffled = [...wallets].sort(() => Math.random() - 0.5);
      reorderPromises.push(
        updateWalletsOrder(
          shuffled.map((w, idx) => ({ id: w.id!, display_order: idx }))
        )
      );
    }
    
    await Promise.all(reorderPromises);
    
    // Verify integrity
    const finalWallets = await getWallets();
    const orders = finalWallets.map(w => w.display_order);
    
    // No duplicates
    expect(new Set(orders).size).toBe(orders.length);
    
    // Sequential
    expect(Math.min(...orders)).toBe(0);
    expect(Math.max(...orders)).toBe(orders.length - 1);
  });
});
```

---

## Debugging Steps

### Step 1: Add Hermes Detection
```typescript
// src/utils/platform.ts
export function detectJSEngine(): 'hermes' | 'jsc' | 'unknown' {
  if (typeof HermesInternal !== 'undefined') {
    return 'hermes';
  }
  if (typeof JavaScriptCore !== 'undefined') {
    return 'jsc';
  }
  return 'unknown';
}

export function logEnvironmentInfo() {
  console.log('[ENV] JS Engine:', detectJSEngine());
  console.log('[ENV] __DEV__:', __DEV__);
  console.log('[ENV] Date precision:', Date.now());
}
```

### Step 2: Add SQLite Type Logging
```typescript
// src/lib/db/wallets.ts - Enhanced createWallet
export async function createWallet(w: Wallet) {
  const existingWallets = await exec<{ count: number }>('SELECT COUNT(*) as count FROM wallets;');
  const nextDisplayOrder = existingWallets[0]?.count ?? 0;
  
  // RELEASE DEBUG: Log type information
  console.log('[RELEASE_DEBUG] Creating wallet with display_order:', {
    value: nextDisplayOrder,
    type: typeof nextDisplayOrder,
    isInteger: Number.isInteger(nextDisplayOrder),
    countValue: existingWallets[0]?.count,
    countType: typeof existingWallets[0]?.count,
  });
  
  // ... rest of implementation
}
```

### Step 3: Add Transaction Logging
```typescript
// src/lib/db/index.ts - Enhanced transaction wrapper
export async function execRun(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
  try {
    const database = await getDb();
    
    // RELEASE DEBUG: Log SQL statements
    if (sql.includes('UPDATE wallets SET display_order')) {
      console.log('[RELEASE_DEBUG] Reorder SQL:', {
        sql,
        params,
        timestamp: Date.now(),
      });
    }
    
    const result = await database.runAsync(sql, params);
    return result;
  } catch (err: any) {
    console.error('[RELEASE_DEBUG] SQL Error:', {
      sql,
      params,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}
```

---

## Expected Issues & Solutions

### Issue 1: display_order Type Coercion
**Symptom:** `display_order` becomes a float in release builds
**Root Cause:** Hermes number handling or SQLite type affinity
**Solution:**
```typescript
// Force integer type
const nextDisplayOrder = Math.floor(existingWallets[0]?.count ?? 0);
```

### Issue 2: Transaction Rollback Failure
**Symptom:** Partial updates persist even on error
**Root Cause:** expo-sqlite transaction handling in release
**Solution:**
```typescript
// Add explicit error handling
await database.withTransactionAsync(async () => {
  try {
    // ... updates
  } catch (err) {
    console.error('[RELEASE_DEBUG] Transaction error, will rollback');
    throw err; // Ensure rollback
  }
});
```

### Issue 3: Concurrent Access Race
**Symptom:** Duplicate display_order values in release
**Root Cause:** Different promise scheduling in Hermes
**Solution:**
```typescript
// Add explicit locking mechanism
const reorderLock = new Map<string, Promise<void>>();

export async function updateWalletsOrder(orderUpdates: Array<{ id: number; display_order: number }>): Promise<void> {
  const lockKey = 'reorder';
  
  // Wait for any pending reorder
  if (reorderLock.has(lockKey)) {
    await reorderLock.get(lockKey);
  }
  
  const operation = (async () => {
    // ... existing implementation
  })();
  
  reorderLock.set(lockKey, operation);
  
  try {
    await operation;
  } finally {
    reorderLock.delete(lockKey);
  }
}
```

---

## Next Steps

1. ✅ Document tech stack and build configuration
2. ⏳ Build local release APK for testing
3. ⏳ Add Hermes detection and environment logging
4. ⏳ Create release-specific test cases
5. ⏳ Add transaction and SQL logging for debugging
6. ⏳ Test wallet reorder in release build
7. ⏳ Capture database state before/after operations
8. ⏳ Identify specific failure point
9. ⏳ Implement fix with release-mode validation
10. ⏳ Update observability for production monitoring

---

## Build & Test Commands

```bash
# Build preview (debuggable release)
eas build --platform android --profile preview --local

# Or if EAS not available, use expo prebuild
npx expo prebuild
cd android
./gradlew assembleRelease

# Install and test
adb install app/build/outputs/apk/release/app-release.apk
adb logcat | grep -E "(RELEASE_DEBUG|SQLite|pocketflow)"

# Capture DB from device
adb exec-out run-as com.eiteone.pocketflow cat databases/pocketflow.db > pocketflow_backup.db
sqlite3 pocketflow_backup.db "SELECT * FROM wallets ORDER BY display_order;"
```

---

**Status:** Investigation framework established. Awaiting release build testing results.
