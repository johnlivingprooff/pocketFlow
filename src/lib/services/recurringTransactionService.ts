import { exec, execRun } from '../db';
import { Transaction, RecurrenceFrequency } from '../../types/transaction';

/**
 * Processes all recurring transactions and generates new instances if needed.
 * Should be called on app startup or when returning to foreground.
 */
export async function processRecurringTransactions(): Promise<void> {
  try {
    // Get all recurring transactions (templates)
    const recurringTransactions = await exec<Transaction>(
      `SELECT * FROM transactions 
       WHERE is_recurring = 1 
       AND (recurrence_end_date IS NULL OR recurrence_end_date >= date('now'))`
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

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

      for (const instanceDate of instancesToGenerate) {
        await createRecurringInstance(template, instanceDate);
      }
    }
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
  }
}

/**
 * Calculate which dates need transaction instances generated
 */
function calculateMissingInstances(
  startDate: Date,
  endDate: Date,
  frequency: RecurrenceFrequency,
  recurrenceEndDate?: string
): Date[] {
  const instances: Date[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  const recurEnd = recurrenceEndDate ? new Date(recurrenceEndDate) : null;

  // Start from the next occurrence after startDate
  advanceDate(current, frequency);

  while (current <= end) {
    // Check if we've passed the recurrence end date
    if (recurEnd && current > recurEnd) break;

    instances.push(new Date(current));
    advanceDate(current, frequency);
  }

  return instances;
}

/**
 * Advance a date by one recurrence period
 */
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

/**
 * Create a new transaction instance from a recurring template
 */
async function createRecurringInstance(
  template: Transaction,
  instanceDate: Date
): Promise<void> {
  const dateStr = instanceDate.toISOString();

  await execRun(
    `INSERT INTO transactions 
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

/**
 * Get all recurring transaction templates (not the generated instances)
 */
export async function getRecurringTemplates(): Promise<Transaction[]> {
  return await exec<Transaction>(
    `SELECT * FROM transactions 
     WHERE is_recurring = 1 
     ORDER BY date DESC`
  );
}

/**
 * Cancel a recurring transaction (stops future generations)
 */
export async function cancelRecurringTransaction(templateId: number): Promise<void> {
  await execRun(
    `UPDATE transactions 
     SET is_recurring = 0, recurrence_end_date = date('now') 
     WHERE id = ?`,
    [templateId]
  );
}

/**
 * Update recurring transaction settings
 */
export async function updateRecurringTransaction(
  templateId: number,
  frequency: RecurrenceFrequency,
  endDate?: string
): Promise<void> {
  await execRun(
    `UPDATE transactions 
     SET recurrence_frequency = ?, recurrence_end_date = ? 
     WHERE id = ?`,
    [frequency, endDate || null, templateId]
  );
}
