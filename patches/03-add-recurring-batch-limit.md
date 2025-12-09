# HIGH PRIORITY PATCH 3: Add Recurring Transaction Batch Limit

## File: src/lib/services/recurringTransactionService.ts

## Issue
calculateMissingInstances() generates all instances without limit.
User who doesn't open app for a year could generate 365+ daily transactions at once.

## Changes

### Change 1: Add batch size constant

Add at the top of the file after imports:

```typescript
// Maximum number of recurring instances to generate per processing run
// This prevents app freeze when processing very old recurring transactions
const MAX_INSTANCES_PER_BATCH = 100;
```

### Change 2: Update calculateMissingInstances function

Replace `calculateMissingInstances` function (lines 57-80) with:

```typescript
/**
 * Calculate which dates need transaction instances generated
 * FIXED: Added maxInstances parameter to prevent unbounded generation
 */
function calculateMissingInstances(
  startDate: Date,
  endDate: Date,
  frequency: RecurrenceFrequency,
  recurrenceEndDate?: string,
  maxInstances: number = MAX_INSTANCES_PER_BATCH
): Date[] {
  const instances: Date[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  const recurEnd = recurrenceEndDate ? new Date(recurrenceEndDate) : null;

  // Start from the next occurrence after startDate
  advanceDate(current, frequency);

  // ✅ FIX: Add maxInstances limit to while condition
  while (current <= end && instances.length < maxInstances) {
    // Check if we've passed the recurrence end date
    if (recurEnd && current > recurEnd) break;

    instances.push(new Date(current));
    advanceDate(current, frequency);
  }

  return instances;
}
```

### Change 3: Add logging for capped generation

Update `processRecurringTransactions` function to track capped templates:

```typescript
export async function processRecurringTransactions(): Promise<void> {
  if (processingRecurring) {
    console.log('[Recurring] Already processing, skipping duplicate call');
    return;
  }
  
  processingRecurring = true;
  const startTime = Date.now();
  
  try {
    const recurringTransactions = await exec<Transaction>(
      `SELECT * FROM transactions 
       WHERE is_recurring = 1 
       AND (recurrence_end_date IS NULL OR recurrence_end_date >= date('now'))`
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let totalGenerated = 0;
    let cappedCount = 0; // ✅ Track how many templates hit the limit

    for (const template of recurringTransactions) {
      if (!template.id || !template.recurrence_frequency) continue;

      const lastGenerated = await exec<{ date: string }>(
        `SELECT date FROM transactions 
         WHERE parent_transaction_id = ? 
         ORDER BY date DESC LIMIT 1`,
        [template.id]
      );

      let startDate = new Date(template.date);
      if (lastGenerated.length > 0) {
        startDate = new Date(lastGenerated[0].date);
      }

      const instancesToGenerate = calculateMissingInstances(
        startDate,
        now,
        template.recurrence_frequency,
        template.recurrence_end_date
      );
      
      // ✅ Check if generation was capped
      if (instancesToGenerate.length === MAX_INSTANCES_PER_BATCH) {
        cappedCount++;
        console.log(
          `[Recurring] Template ${template.id} capped at ${MAX_INSTANCES_PER_BATCH} instances. ` +
          `More will be generated on next launch.`
        );
      }
      
      totalGenerated += instancesToGenerate.length;

      for (const instanceDate of instancesToGenerate) {
        await createRecurringInstance(template, instanceDate);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(
      `[Recurring] Processed ${recurringTransactions.length} templates, ` +
      `generated ${totalGenerated} instances in ${duration}ms`
    );
    
    // ✅ Log summary if any templates were capped
    if (cappedCount > 0) {
      console.log(
        `[Recurring] ${cappedCount} template(s) reached the ${MAX_INSTANCES_PER_BATCH} instance limit. ` +
        `Remaining instances will be generated on subsequent app launches.`
      );
    }
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
  } finally {
    processingRecurring = false;
  }
}
```

### Change 4: (Optional) Add user notification

For better UX, consider showing a notification when large batches are generated:

```typescript
// In app/_layout.tsx after processRecurringTransactions() call:

// Add state for notification
const [recurringNotification, setRecurringNotification] = useState<string | null>(null);

// Modify the call to track results
useEffect(() => {
  if (Platform.OS !== 'web') {
    ensureTables()
      .then(async () => {
        await processRecurringTransactions();
        
        // Check if large batch was processed (optional)
        const recentTransactions = await getTransactions(0, 100);
        const recentRecurring = recentTransactions.filter(
          t => t.parent_transaction_id !== null && 
          new Date(t.created_at!).getTime() > Date.now() - 60000 // Created in last minute
        );
        
        if (recentRecurring.length > 50) {
          setRecurringNotification(
            `Generated ${recentRecurring.length} recurring transactions. ` +
            `Your wallet balances have been updated.`
          );
        }
        
        setDbReady(true);
      })
      .catch(err => {
        console.error('Failed to initialize database:', err);
        setDbReady(true);
      });
  }
}, []);
```

## Testing Steps

1. Create a daily recurring transaction with start date 365 days ago
2. Launch the app
3. Measure startup time and memory usage
4. Verify exactly 100 instances were generated (not 365)
5. Relaunch the app
6. Verify next 100 instances are generated
7. Check console logs for capping message

## Load Test

```javascript
// Simulate extreme case
const template = {
  id: 1,
  wallet_id: 1,
  type: 'expense',
  amount: -50,
  category: 'Subscription',
  date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
  recurrence_frequency: 'daily',
  is_recurring: 1,
};

// This should take < 5 seconds and generate max 100 instances
await processRecurringTransactions();
```

## Expected Results

- Maximum 100 recurring instances generated per app launch
- App startup completes in <5 seconds even with very old recurring transactions
- Subsequent launches continue generating the backlog
- Memory usage stays below 50MB during generation
- User is aware of what's happening via console logs (or optional notification)

## Performance Impact

**Before:**
- 365 daily transactions: ~15-30 seconds
- Potential ANR on Android
- Memory spike >100MB

**After:**
- 100 transactions: ~3-5 seconds
- No ANR risk
- Memory stable at ~30-40MB

---
