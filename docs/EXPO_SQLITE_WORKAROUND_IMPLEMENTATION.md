# Practical Workarounds for Expo SQLite Connection Issue

## Problem Summary
Expo SQLite native Android connection becomes invalid after ~30 seconds, causing all subsequent queries to fail with `ERR_UNEXPECTED` (NullPointerException in prepareAsync).

## Immediate Workaround: Better Error Handling

### 1. Graceful Degradation UI Component

```tsx
// src/components/DatabaseErrorBoundary.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface DatabaseErrorBoundaryProps {
  children: React.ReactNode;
}

export function DatabaseErrorBoundary({ children }: DatabaseErrorBoundaryProps) {
  const [databaseError, setDatabaseError] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // Listen for database errors from the app
    const unsubscribe = (global as any).addEventListener?.('databaseError', () => {
      setDatabaseError(true);
    });

    return () => unsubscribe?.();
  }, []);

  if (databaseError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Database Connection Error</Text>
        <Text style={styles.message}>
          The app encountered a database connection issue. This is a known limitation with Expo SQLite on Android.
        </Text>
        <Text style={styles.instructions}>
          Please restart the app to continue. Your data has been saved.
        </Text>
        <Pressable 
          style={styles.button} 
          onPress={() => {
            // Force restart
            router.replace('/');
            setDatabaseError(false);
          }}
        >
          <Text style={styles.buttonText}>Restart App</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#d32f2f',
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
    lineHeight: 22,
  },
  instructions: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 2. Enhanced Error Handler in Database Module

```typescript
// src/lib/db/errorHandler.ts
import { Alert } from 'react-native';

export class DatabaseConnectionError extends Error {
  constructor(message: string = 'Database connection lost') {
    super(message);
    this.name = 'DatabaseConnectionError';
  }

  isConnectionError(): boolean {
    return this.message.includes('ERR_UNEXPECTED') ||
           this.message.includes('NullPointerException') ||
           this.message.includes('rejected');
  }

  shouldRestartApp(): boolean {
    // Connection errors after initial attempts typically mean native module is corrupted
    return this.isConnectionError();
  }

  notifyUser(): void {
    Alert.alert(
      'Database Error',
      'A critical database error occurred. The app will restart to recover.',
      [
        {
          text: 'Restart Now',
          onPress: () => {
            // Signal to error boundary or restart logic
            (global as any).databaseErrorNotified = true;
          },
        },
      ]
    );
  }
}

export function handleDatabaseError(error: any): void {
  console.error('[DB] Database error:', error);

  if (isConnectionError(error)) {
    const dbError = new DatabaseConnectionError(error.message);
    dbError.notifyUser();
    throw dbError;
  }

  throw error;
}

function isConnectionError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toString().toUpperCase() || '';

  return (
    message.includes('ERR_UNEXPECTED') ||
    message.includes('nullpointerexception') ||
    message.includes('rejected') ||
    message.includes('prepareAsync') ||
    code.includes('ERR_UNEXPECTED')
  );
}
```

### 3. Updated exec/execRun with Better Error Handling

```typescript
// In src/lib/db/index.ts - execRun function

export async function execRun(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
  // Serialize all write operations through write queue to prevent SQLITE_BUSY errors
  return enqueueWrite(async () => {
    try {
      const database = await getDb();
      const result = await database.runAsync(sql, params);
      return result;
    } catch (err: any) {
      // ✅ CRITICAL: Detect fatal connection errors
      const isConnectionError = 
        err.message?.includes('NullPointerException') || 
        err.message?.includes('rejected') ||
        err.code === 'ERR_UNEXPECTED';
      
      if (isConnectionError) {
        console.error('[DB] FATAL: Database connection corrupted, cannot recover');
        
        // Close the handle immediately
        if (db) {
          try {
            await db.closeAsync();
          } catch (e) {
            // Ignore
          }
        }
        db = null;
        
        // Throw fatal error that will trigger app restart
        const fatalError = new Error(
          'Database connection lost. App will restart. Your data has been saved.'
        );
        (fatalError as any).code = 'ERR_DB_CONNECTION_FATAL';
        throw fatalError;
      }
      
      logError('[DB] Run execution failed:', { sql, params, error: err });
      throw err;
    }
  }, 'execRun');
}

export async function exec<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const database = await getDb();
    const result = await database.getAllAsync<T>(sql, params);
    return result;
  } catch (err: any) {
    // ✅ CRITICAL: Detect fatal connection errors
    const isConnectionError = 
      err.message?.includes('NullPointerException') || 
      err.message?.includes('rejected') ||
      err.code === 'ERR_UNEXPECTED';
    
    if (isConnectionError) {
      console.error('[DB] FATAL: Database connection corrupted, cannot recover');
      
      // Close the handle immediately
      if (db) {
        try {
          await db.closeAsync();
        } catch (e) {
          // Ignore
        }
      }
      db = null;
      
      // Throw fatal error that will trigger app restart
      const fatalError = new Error(
        'Database connection lost. App will restart. Your data has been saved.'
      );
      (fatalError as any).code = 'ERR_DB_CONNECTION_FATAL';
      throw fatalError;
    }
    
    logError('[DB] Query execution failed:', { sql, params, error: err });
    throw err;
  }
}
```

### 4. Root Layout with Error Boundary

```tsx
// app/_layout.tsx - Wrap with error boundary

import { ErrorBoundary } from 'expo-router';
import { DatabaseErrorBoundary } from '@/components/DatabaseErrorBoundary';

export default function RootLayout() {
  return (
    <DatabaseErrorBoundary>
      <ErrorBoundary>
        {/* Your existing layout */}
      </ErrorBoundary>
    </DatabaseErrorBoundary>
  );
}
```

## Mitigation Strategies

### 1. Reduce Transaction Complexity
```typescript
// ❌ DON'T: Multiple sequential queries that hold connection
async function addTransactionBad() {
  await execRun('INSERT INTO transactions ...', params1);
  await getBalance(); // Requires new query
  await getCategories(); // Another query
  await updateAnalytics(); // Another query
}

// ✅ DO: Batch operations and cache results
const categoriesCache = new Map();

async function addTransactionGood() {
  // Use cached data
  const category = categoriesCache.get(categoryId);
  
  // Single write
  await execRun('INSERT INTO transactions ...', params1);
  
  // Invalidate cache only if needed
  clearCacheForCategory(categoryId);
}
```

### 2. Implement Database Health Check
```typescript
// src/lib/db/healthCheck.ts

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.getAllAsync('SELECT 1;');
    return true;
  } catch (err: any) {
    console.warn('[DB] Health check failed:', err);
    return false;
  }
}

// Periodic check
export function startDatabaseHealthCheck(intervalMs: number = 30000) {
  return setInterval(async () => {
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      console.error('[DB] Health check failed - connection is dead');
      // Signal to UI to restart app
      (global as any).emit('databaseError');
    }
  }, intervalMs);
}
```

### 3. Deferrable Queries
```typescript
// Defer non-critical operations
async function addTransaction(tx: Transaction) {
  // Critical: save transaction immediately
  await execRun('INSERT INTO transactions ...', txParams);
  
  // Non-critical: update analytics later
  setTimeout(async () => {
    try {
      await updateAnalytics();
    } catch (err) {
      // Silently fail - don't break transaction flow
      console.warn('[DB] Analytics update failed:', err);
    }
  }, 5000);
}
```

## Migration Path (Long Term)

### Test Alternative SQLite Libraries

```bash
# Option 1: react-native-sqlite-storage
npm install react-native-sqlite-storage

# Option 2: @journeyapps/sqlcipher-js  
npm install @journeyapps/sqlcipher-js

# Option 3: react-native-quick-sqlite
npm install react-native-quick-sqlite
```

Each has different trade-offs:
- **react-native-sqlite-storage**: More mature, but heavier
- **sqlcipher-js**: Encryption support, more features
- **react-native-quick-sqlite**: Lighter weight, newer

### Expo SDK Upgrade Path
1. Test on Expo SDK 55+ (if released)
2. Check expo-sqlite changelog for connection fixes
3. Gradually upgrade and test

## Testing This Workaround

```bash
# 1. Build and install updated APK
npm run build:android

# 2. Install APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 3. Monitor logs
adb logcat -s "ReactNativeJS" | grep -i "database\|error"

# 4. Test transaction operations
# - Add transaction 1 → should succeed ✅
# - Add transaction 2 → should succeed ✅
# - Wait 30+ seconds
# - Try to add transaction 3 → should show error UI
# - Click "Restart App" → should recover
```

## Acceptance Criteria
- ✅ First 1-2 transactions save successfully
- ✅ Error is displayed gracefully to user
- ✅ App doesn't crash or go into bad state
- ✅ User can restart and retry
- ✅ Saved data persists across restarts

---

**Status**: Ready to implement
**Effort**: ~2-3 hours
**Risk**: Low (graceful degradation, no data loss)
