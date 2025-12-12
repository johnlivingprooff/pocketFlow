# PocketFlow Observability & Monitoring Recommendations

## Overview

This document provides instrumentation recommendations for PocketFlow to improve visibility into backend operations, async engines, and data flows.

---

## Structured Logging

### Current State
- ✅ Uses custom logger (`src/utils/logger.ts`)
- ✅ Logs database operations with timing
- ⚠️ Logs not aggregated or queryable
- ⚠️ No request/operation correlation IDs

### Recommendations

#### 1. Add Operation Correlation IDs

```typescript
// src/utils/logger.ts
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function log(message: string, context?: Record<string, any>, operationId?: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    operationId: operationId || 'unknown',
    ...context,
  };
  
  if (__DEV__) {
    console.log(JSON.stringify(logEntry));
  }
  
  // In production, send to logging service or store in local DB
  if (!__DEV__) {
    // TODO: Send to remote logging service (Firebase, Sentry, etc.)
  }
}
```

#### 2. Instrument Critical Operations

```typescript
// Example: Wallet creation with full tracing
export async function createWallet(wallet: WalletInput) {
  const operationId = generateOperationId();
  const startTime = Date.now();
  
  log('[Wallet] Creating wallet', { 
    name: wallet.name, 
    currency: wallet.currency,
    operationId 
  }, operationId);
  
  try {
    const result = await execRun(
      `INSERT INTO wallets (name, currency, initial_balance, type, description, exchange_rate, created_at, display_order)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 
         COALESCE((SELECT MAX(display_order) + 1 FROM wallets), 0));`,
      [wallet.name, wallet.currency, wallet.initial_balance ?? 0, wallet.type ?? null, 
       wallet.description ?? null, wallet.exchange_rate ?? 1.0]
    );
    
    const duration = Date.now() - startTime;
    log('[Wallet] Created successfully', { 
      walletId: result.lastInsertRowId, 
      duration,
      operationId 
    }, operationId);
    
    return result.lastInsertRowId;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logError('[Wallet] Creation failed', { 
      error: err.message, 
      duration,
      operationId 
    }, operationId);
    throw err;
  }
}
```

---

## Key Metrics to Track

### Database Metrics

**1. Query Latency**
```typescript
// src/lib/db/index.ts
const queryMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  avgLatency: 0,
  p95Latency: 0,
  latencies: [] as number[],
};

export async function exec<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const startTime = Date.now();
  try {
    const database = await getDb();
    const result = await database.getAllAsync<T>(sql, params);
    const duration = Date.now() - startTime;
    
    // Track metrics
    queryMetrics.totalQueries++;
    queryMetrics.latencies.push(duration);
    
    if (duration > 500) {
      queryMetrics.slowQueries++;
      logError('[DB] Slow query detected', { sql, params, duration });
    }
    
    return result;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logError('[DB] Query execution failed:', { sql, params, error: err, duration });
    throw err;
  }
}

export function getQueryMetrics() {
  const sortedLatencies = [...queryMetrics.latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  
  return {
    totalQueries: queryMetrics.totalQueries,
    slowQueries: queryMetrics.slowQueries,
    avgLatency: queryMetrics.latencies.reduce((a, b) => a + b, 0) / queryMetrics.latencies.length || 0,
    p95Latency: sortedLatencies[p95Index] || 0,
    p99Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0,
  };
}

// Reset metrics periodically (e.g., every hour)
export function resetQueryMetrics() {
  queryMetrics.totalQueries = 0;
  queryMetrics.slowQueries = 0;
  queryMetrics.latencies = [];
}
```

**2. Database Lock Errors**
```typescript
let lockErrors = 0;
let lockErrorRate = 0;

// In exec() catch block:
if (err?.message?.includes('SQLITE_BUSY') || err?.message?.includes('database is locked')) {
  lockErrors++;
  lockErrorRate = lockErrors / queryMetrics.totalQueries;
  
  if (lockErrorRate > 0.01) { // >1% lock error rate
    logError('[DB] High lock error rate detected', { 
      lockErrors, 
      totalQueries: queryMetrics.totalQueries,
      lockErrorRate: `${(lockErrorRate * 100).toFixed(2)}%`
    });
  }
}
```

**3. Cache Effectiveness**
```typescript
// src/lib/cache/queryCache.ts
class QueryCache {
  private hits = 0;
  private misses = 0;
  
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() - entry.timestamp > this.ttl) {
      this.misses++;
      return undefined;
    }
    
    this.hits++;
    entry.hits++;
    return entry.value as T;
  }
  
  getMetrics() {
    const hitRate = this.hits + this.misses > 0 
      ? this.hits / (this.hits + this.misses) 
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${(hitRate * 100).toFixed(2)}%`,
    };
  }
}
```

### Operation Metrics

**4. Recurring Transaction Processing**
```typescript
// src/lib/services/recurringTransactionService.ts
export interface RecurringMetrics {
  lastProcessedAt: string;
  processingDurationMs: number;
  templatesProcessed: number;
  instancesGenerated: number;
  errors: number;
}

let recurringMetrics: RecurringMetrics = {
  lastProcessedAt: '',
  processingDurationMs: 0,
  templatesProcessed: 0,
  instancesGenerated: 0,
  errors: 0,
};

export async function processRecurringTransactions(): Promise<void> {
  const startTime = Date.now();
  let templatesProcessed = 0;
  let instancesGenerated = 0;
  let errors = 0;
  
  try {
    const recurringTransactions = await exec<Transaction>(...);
    templatesProcessed = recurringTransactions.length;
    
    for (const template of recurringTransactions) {
      try {
        const instancesToGenerate = calculateMissingInstances(...);
        instancesGenerated += instancesToGenerate.length;
        
        for (const instanceDate of instancesToGenerate) {
          await createRecurringInstance(template, instanceDate);
        }
      } catch (error) {
        errors++;
        console.error('Error processing recurring template:', error);
      }
    }
  } catch (error) {
    errors++;
    console.error('Error processing recurring transactions:', error);
  } finally {
    recurringMetrics = {
      lastProcessedAt: new Date().toISOString(),
      processingDurationMs: Date.now() - startTime,
      templatesProcessed,
      instancesGenerated,
      errors,
    };
    
    log('[Recurring] Processing complete', recurringMetrics);
  }
}

export function getRecurringMetrics(): RecurringMetrics {
  return { ...recurringMetrics };
}
```

**5. Backup/Restore Operations**
```typescript
// Track success rate and duration
let backupMetrics = {
  totalBackups: 0,
  successfulBackups: 0,
  failedBackups: 0,
  avgBackupDurationMs: 0,
  lastBackupAt: '',
  
  totalRestores: 0,
  successfulRestores: 0,
  failedRestores: 0,
  avgRestoreDurationMs: 0,
  lastRestoreAt: '',
};

export async function createBackup(): Promise<{ success: boolean; uri?: string; error?: string }> {
  const startTime = Date.now();
  backupMetrics.totalBackups++;
  
  try {
    // ... existing backup logic ...
    
    const duration = Date.now() - startTime;
    backupMetrics.successfulBackups++;
    backupMetrics.avgBackupDurationMs = 
      (backupMetrics.avgBackupDurationMs * (backupMetrics.totalBackups - 1) + duration) / backupMetrics.totalBackups;
    backupMetrics.lastBackupAt = new Date().toISOString();
    
    log('[Backup] Created successfully', { duration, uri: fileUri });
    
    return { success: true, uri: fileUri };
  } catch (error) {
    backupMetrics.failedBackups++;
    // ... error handling ...
  }
}
```

---

## Health Check Screen

Create a new diagnostics screen to display metrics:

```typescript
// app/settings/diagnostics.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { getQueryMetrics, resetQueryMetrics } from '../../src/lib/db';
import { analyticsCache, walletCache, transactionCache } from '../../src/lib/cache/queryCache';
import { getRecurringMetrics } from '../../src/lib/services/recurringTransactionService';

export default function DiagnosticsScreen() {
  const [metrics, setMetrics] = useState({
    database: getQueryMetrics(),
    analyticsCache: analyticsCache.getMetrics(),
    walletCache: walletCache.getMetrics(),
    transactionCache: transactionCache.getMetrics(),
    recurring: getRecurringMetrics(),
  });
  
  const refreshMetrics = () => {
    setMetrics({
      database: getQueryMetrics(),
      analyticsCache: analyticsCache.getMetrics(),
      walletCache: walletCache.getMetrics(),
      transactionCache: transactionCache.getMetrics(),
      recurring: getRecurringMetrics(),
    });
  };
  
  useEffect(() => {
    const interval = setInterval(refreshMetrics, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        App Diagnostics
      </Text>
      
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Database Performance
        </Text>
        <Text>Total Queries: {metrics.database.totalQueries}</Text>
        <Text>Slow Queries (&gt;500ms): {metrics.database.slowQueries}</Text>
        <Text>Avg Latency: {metrics.database.avgLatency.toFixed(2)}ms</Text>
        <Text>P95 Latency: {metrics.database.p95Latency.toFixed(2)}ms</Text>
        <Text>P99 Latency: {metrics.database.p99Latency.toFixed(2)}ms</Text>
      </View>
      
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Cache Performance
        </Text>
        <Text>Analytics Cache Hit Rate: {metrics.analyticsCache.hitRate}</Text>
        <Text>Wallet Cache Hit Rate: {metrics.walletCache.hitRate}</Text>
        <Text>Transaction Cache Hit Rate: {metrics.transactionCache.hitRate}</Text>
      </View>
      
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Recurring Transactions
        </Text>
        <Text>Last Processed: {metrics.recurring.lastProcessedAt || 'Never'}</Text>
        <Text>Duration: {metrics.recurring.processingDurationMs}ms</Text>
        <Text>Templates: {metrics.recurring.templatesProcessed}</Text>
        <Text>Instances Generated: {metrics.recurring.instancesGenerated}</Text>
        <Text>Errors: {metrics.recurring.errors}</Text>
      </View>
      
      <TouchableOpacity 
        onPress={() => {
          resetQueryMetrics();
          refreshMetrics();
        }}
        style={{ 
          backgroundColor: '#007AFF', 
          padding: 16, 
          borderRadius: 8, 
          alignItems: 'center',
          marginTop: 16,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Reset Metrics</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

---

## Alert Conditions

### Critical Alerts

1. **High Database Lock Error Rate**
   - Condition: Lock errors > 1% of total queries
   - Action: Log error, consider implementing retry logic

2. **Recurring Transaction Processing Failure**
   - Condition: Processing fails 3 times consecutively
   - Action: Disable recurring processing, notify user

3. **Backup Failure Rate**
   - Condition: >20% backup failure rate
   - Action: Check disk space, log detailed error

4. **Slow Query Threshold**
   - Condition: P95 latency > 1000ms
   - Action: Log query plan, consider adding indexes

### Warning Alerts

1. **Low Cache Hit Rate**
   - Condition: Hit rate < 30% over 1 hour
   - Action: Review cache TTL settings

2. **Large Recurring Batch**
   - Condition: >50 instances generated in single run
   - Action: Log warning, consider notifying user

3. **Database Size Growth**
   - Condition: Database > 100MB
   - Action: Suggest cleanup or export

---

## Performance Dashboards

### Recommended Metrics to Display

**Dashboard 1: Database Health**
- Query count per minute (line chart)
- P95 latency over time (line chart)
- Slow query count (gauge)
- Lock error rate (gauge)

**Dashboard 2: Cache Effectiveness**
- Cache hit rate by type (pie chart)
- Cache size over time (line chart)
- Eviction rate (gauge)

**Dashboard 3: Operations**
- Transactions per day (bar chart)
- Backup success rate (gauge)
- Recurring instances generated (line chart)
- App startup time (histogram)

---

## Integration with External Services

### Option 1: Firebase Analytics
```typescript
import analytics from '@react-native-firebase/analytics';

export async function logDatabaseMetrics() {
  const metrics = getQueryMetrics();
  
  await analytics().logEvent('database_metrics', {
    total_queries: metrics.totalQueries,
    slow_queries: metrics.slowQueries,
    avg_latency: Math.round(metrics.avgLatency),
    p95_latency: Math.round(metrics.p95Latency),
  });
}
```

### Option 2: Sentry Performance Monitoring
```typescript
import * as Sentry from '@sentry/react-native';

export async function exec<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const transaction = Sentry.startTransaction({
    op: 'db.query',
    name: sql.split(' ')[0], // SELECT, INSERT, UPDATE, DELETE
  });
  
  try {
    const database = await getDb();
    const result = await database.getAllAsync<T>(sql, params);
    transaction.setStatus('ok');
    return result;
  } catch (err: any) {
    transaction.setStatus('internal_error');
    Sentry.captureException(err);
    throw err;
  } finally {
    transaction.finish();
  }
}
```

### Option 3: Custom Logging Service
```typescript
// Send metrics to your own backend
export async function flushMetricsToServer() {
  const metrics = {
    database: getQueryMetrics(),
    cache: {
      analytics: analyticsCache.getMetrics(),
      wallet: walletCache.getMetrics(),
      transaction: transactionCache.getMetrics(),
    },
    recurring: getRecurringMetrics(),
    timestamp: new Date().toISOString(),
    deviceId: await getDeviceId(),
  };
  
  try {
    await fetch('https://your-metrics-api.com/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    });
  } catch (error) {
    console.error('Failed to send metrics:', error);
  }
}
```

---

## Local Metrics Storage

For offline analysis, store metrics in SQLite:

```typescript
// Create metrics table
await database.execAsync(`
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metadata TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
  CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type);
`);

// Store metric
export async function recordMetric(
  type: string,
  name: string,
  value: number,
  metadata?: Record<string, any>
) {
  await execRun(
    `INSERT INTO metrics (timestamp, metric_type, metric_name, metric_value, metadata)
     VALUES (datetime('now'), ?, ?, ?, ?)`,
    [type, name, value, metadata ? JSON.stringify(metadata) : null]
  );
}

// Query metrics
export async function getMetricsForPeriod(
  type: string,
  startDate: Date,
  endDate: Date
) {
  return await exec<{
    timestamp: string;
    metric_name: string;
    metric_value: number;
  }>(
    `SELECT timestamp, metric_name, metric_value
     FROM metrics
     WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
     ORDER BY timestamp ASC`,
    [type, startDate.toISOString(), endDate.toISOString()]
  );
}
```

---

## Continuous Monitoring Setup

### 1. Hourly Metrics Collection
```typescript
// app/_layout.tsx
useEffect(() => {
  // Collect and log metrics every hour
  const interval = setInterval(() => {
    const metrics = {
      database: getQueryMetrics(),
      cache: {
        analytics: analyticsCache.getStats(),
        wallet: walletCache.getStats(),
        transaction: transactionCache.getStats(),
      },
    };
    
    log('[Metrics] Hourly report', metrics);
    
    // Reset counters
    resetQueryMetrics();
  }, 60 * 60 * 1000); // 1 hour
  
  return () => clearInterval(interval);
}, []);
```

### 2. App Lifecycle Metrics
```typescript
// Track app usage patterns
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      recordMetric('app_lifecycle', 'foreground', 1);
    } else if (nextAppState === 'background') {
      recordMetric('app_lifecycle', 'background', 1);
      
      // Flush metrics before backgrounding
      flushMetricsToServer();
    }
  });
  
  return () => subscription.remove();
}, []);
```

---

## Summary

**Immediate Actions:**
1. Add operation correlation IDs to logger
2. Implement query latency tracking
3. Create diagnostics screen for developers

**Short-term (Next Sprint):**
1. Add cache effectiveness metrics
2. Implement recurring transaction metrics
3. Set up local metrics storage

**Long-term:**
1. Integrate with Firebase Analytics or Sentry
2. Build performance dashboards
3. Set up automated alerts

**Estimated Effort:**
- Immediate: 4 hours
- Short-term: 8 hours
- Long-term: 16 hours
