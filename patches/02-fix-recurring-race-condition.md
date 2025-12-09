# CRITICAL PATCH 2: Fix Recurring Transaction Race Condition

## File: src/lib/services/recurringTransactionService.ts

## Issue
processRecurringTransactions() can be called concurrently, creating duplicate instances.

## Changes

### Change 1: Add idempotency to instance creation

Replace `createRecurringInstance` function (lines 105-126) with:

```typescript
/**
 * Create a new transaction instance from a recurring template
 * FIXED: Uses INSERT OR IGNORE to prevent duplicates
 */
async function createRecurringInstance(
  template: Transaction,
  instanceDate: Date
): Promise<void> {
  const dateStr = instanceDate.toISOString();

  // ✅ FIX: Use INSERT OR IGNORE to prevent duplicate instances
  // This makes the operation idempotent
  await execRun(
    `INSERT OR IGNORE INTO transactions 
     (wallet_id, type, amount, category, date, notes, parent_transaction_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.wallet_id,
      template.type,
      template.amount,
      template.category || null,
      dateStr,
      template.notes || null,
      template.id,
      new Date().toISOString()
    ]
  );
}
```

### Change 2: Add UNIQUE index on parent_transaction_id + date

Add to `src/lib/db/index.ts` in the `ensureTables()` function after line 153:

```typescript
// Create index to enforce uniqueness of recurring instances
// This prevents duplicate generation of the same recurring transaction date
try {
  await database.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_unique 
    ON transactions(parent_transaction_id, date) 
    WHERE parent_transaction_id IS NOT NULL;
  `);
} catch (e) {
  // Index may already exist
}
```

### Change 3: Add in-memory lock (optional, defensive)

Add at the top of `src/lib/services/recurringTransactionService.ts` after imports:

```typescript
// In-memory lock to prevent concurrent processing
let processingRecurring = false;
```

Replace `processRecurringTransactions` function (lines 8-52) with:

```typescript
/**
 * Processes all recurring transactions and generates new instances if needed.
 * Should be called on app startup or when returning to foreground.
 * FIXED: Added in-memory lock to prevent concurrent processing
 */
export async function processRecurringTransactions(): Promise<void> {
  // ✅ FIX: Check if already processing
  if (processingRecurring) {
    console.log('[Recurring] Already processing, skipping duplicate call');
    return;
  }
  
  processingRecurring = true;
  const startTime = Date.now();
  
  try {
    // Get all recurring transactions (templates)
    const recurringTransactions = await exec<Transaction>(
      `SELECT * FROM transactions 
       WHERE is_recurring = 1 
       AND (recurrence_end_date IS NULL OR recurrence_end_date >= date('now'))`
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    let totalGenerated = 0;

    for (const template of recurringTransactions) {
      if (!template.id || !template.recurrence_frequency) continue;

      // Find the last generated instance for this template
      const lastGenerated = await exec<{ date: string }>(
        `SELECT date FROM transactions 
         WHERE parent_transaction_id = ? 
         ORDER BY date DESC LIMIT 1`,
        [template.id]
      );

      // Determine the start date for generation
      let startDate = new Date(template.date);
      if (lastGenerated.length > 0) {
        startDate = new Date(lastGenerated[0].date);
      }

      // Generate missing instances up to today
      const instancesToGenerate = calculateMissingInstances(
        startDate,
        now,
        template.recurrence_frequency,
        template.recurrence_end_date
      );
      
      totalGenerated += instancesToGenerate.length;

      for (const instanceDate of instancesToGenerate) {
        await createRecurringInstance(template, instanceDate);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Recurring] Processed ${recurringTransactions.length} templates, generated ${totalGenerated} instances in ${duration}ms`);
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
  } finally {
    processingRecurring = false;
  }
}
```

## Testing Steps

1. Create a daily recurring transaction
2. Call `processRecurringTransactions()` 10 times simultaneously:
   ```typescript
   await Promise.all([
     processRecurringTransactions(),
     processRecurringTransactions(),
     processRecurringTransactions(),
     // ... 7 more
   ]);
   ```
3. Query for duplicates:
   ```sql
   SELECT parent_transaction_id, date, COUNT(*) as cnt 
   FROM transactions 
   WHERE parent_transaction_id IS NOT NULL 
   GROUP BY parent_transaction_id, date 
   HAVING cnt > 1;
   ```
4. Verify: No duplicate instances found

## Expected Results

- No duplicate recurring instances even under concurrent calls
- Function is idempotent (safe to call multiple times)
- Database enforces uniqueness constraint
- In-memory lock prevents wasted processing

---
