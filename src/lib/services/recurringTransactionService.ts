import { exec, getDb } from '../db';
import { Transaction, RecurrenceFrequency } from '../../types/transaction';

// Maximum number of recurring instances to generate per processing run
// This prevents app freeze when processing very old recurring transactions
const MAX_INSTANCES_PER_BATCH = 100;

// In-memory lock to prevent concurrent processing
let processingRecurring = false;

/**
 * Processes all recurring transactions and generates new instances if needed.
 * Should be called on app startup or when returning to foreground.
 */
export function processRecurringTransactions(): void {
  if (processingRecurring) {
    console.log('[Recurring] Already processing, skipping duplicate call');
    return;
  }
  
  processingRecurring = true;
  const startTime = Date.now();
  
  try {
    const recurringTransactions = exec<Transaction>(
      `SELECT * FROM transactions 
       WHERE is_recurring = 1 
       AND (recurrence_end_date IS NULL OR recurrence_end_date >= date('now'))`
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    let totalGenerated = 0;
    let cappedCount = 0;

    for (const template of recurringTransactions) {
      if (!template.id || !template.recurrence_frequency) continue;

      const lastGenerated = exec<{ date: string }>(
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
      
      if (instancesToGenerate.length === MAX_INSTANCES_PER_BATCH) {
        cappedCount++;
        console.log(
          `[Recurring] Template ${template.id} capped at ${MAX_INSTANCES_PER_BATCH} instances. ` +
          `More will be generated on next launch.`
        );
      }
      
      totalGenerated += instancesToGenerate.length;

      if (instancesToGenerate.length > 0) {
        const db = getDb();
        db.transaction(tx => {
          for (const instanceDate of instancesToGenerate) {
            tx.execute(
              `INSERT OR IGNORE INTO transactions 
               (wallet_id, type, amount, category, date, notes, parent_transaction_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                template.wallet_id,
                template.type,
                template.amount,
                template.category || null,
                instanceDate.toISOString(),
                template.notes || null,
                template.id,
                new Date().toISOString()
              ]
            );
          }
        });
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(
      `[Recurring] Processed ${recurringTransactions.length} templates, ` +
      `generated ${totalGenerated} instances in ${duration}ms`
    );
    
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

/**
 * Calculate which dates need transaction instances generated
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

  advanceDate(current, frequency);

  while (current <= end && instances.length < maxInstances) {
    if (recurEnd && current > recurEnd) break;

    instances.push(new Date(current));
    advanceDate(current, frequency);
  }

  return instances;
}

function advanceDate(date: Date, frequency: RecurrenceFrequency): void {
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
}

export function getRecurringTemplates(): Transaction[] {
  return exec<Transaction>(
    `SELECT * FROM transactions 
     WHERE is_recurring = 1 
     ORDER BY date DESC`
  );
}

export function cancelRecurringTransaction(templateId: number): void {
  exec(
    `UPDATE transactions 
     SET is_recurring = 0, recurrence_end_date = date('now') 
     WHERE id = ?`,
    [templateId]
  );
}

export function updateRecurringTransaction(
  templateId: number,
  frequency: RecurrenceFrequency,
  endDate?: string
): void {
  exec(
    `UPDATE transactions 
     SET recurrence_frequency = ?, recurrence_end_date = ? 
     WHERE id = ?`,
    [frequency, endDate || null, templateId]
  );
}
