import { exec, execRun, getDb } from './index';
import { Transaction } from '../../types/transaction';
import { getWallet } from './wallets';
import { analyticsCache, generateCacheKey, invalidateTransactionCaches } from '../cache/queryCache';

export async function addTransaction(t: Transaction) {
  const params = [
    t.wallet_id,
    t.type,
    t.amount,
    t.category ?? null,
    t.date,
    t.notes ?? null,
    t.receipt_uri ?? null,
    t.is_recurring ? 1 : 0,
    t.recurrence_frequency ?? null,
    t.recurrence_end_date ?? null,
    t.parent_transaction_id ?? null,
  ];
  await execRun(
    `INSERT INTO transactions 
     (wallet_id, type, amount, category, date, notes, receipt_uri, is_recurring, recurrence_frequency, recurrence_end_date, parent_transaction_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    params
  );
  
  // Invalidate caches after adding transaction
  invalidateTransactionCaches();
}

/**
 * Add multiple transactions in a single database transaction for better performance
 * Use this when importing data or creating multiple transactions at once
 * @param transactions - Array of transactions to add
 */
export async function addTransactionsBatch(transactions: Transaction[]): Promise<void> {
  if (transactions.length === 0) return;
  
  const database = await getDb();
  
  await database.withTransactionAsync(async () => {
    const statement = await database.prepareAsync(
      `INSERT INTO transactions 
       (wallet_id, type, amount, category, date, notes, receipt_uri, is_recurring, recurrence_frequency, recurrence_end_date, parent_transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
    );
    
    try {
      for (const t of transactions) {
        await statement.executeAsync([
          t.wallet_id,
          t.type,
          t.amount,
          t.category ?? null,
          t.date,
          t.notes ?? null,
          t.receipt_uri ?? null,
          t.is_recurring ? 1 : 0,
          t.recurrence_frequency ?? null,
          t.recurrence_end_date ?? null,
          t.parent_transaction_id ?? null,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
  
  // Invalidate caches after batch insert
  invalidateTransactionCaches();
}

/**
 * Transfer money between two wallets by creating paired transactions
 * Handles currency conversion using wallet exchange rates
 * @param fromWalletId - Source wallet ID
 * @param toWalletId - Destination wallet ID
 * @param amount - Amount to transfer in source wallet's currency (positive number)
 * @param notes - Optional notes for the transfer
 */
export async function transferBetweenWallets(
  fromWalletId: number,
  toWalletId: number,
  amount: number,
  notes?: string
) {
  const now = new Date().toISOString();
  const transferNote = notes ? `Transfer: ${notes}` : 'Transfer between wallets';
  
  // Get wallet details to check currencies and exchange rates
  const fromWalletResult = await getWallet(fromWalletId);
  const toWalletResult = await getWallet(toWalletId);
  
  if (!fromWalletResult[0] || !toWalletResult[0]) {
    throw new Error('Wallet not found');
  }
  
  const fromWallet = fromWalletResult[0];
  const toWallet = toWalletResult[0];
  
  // Calculate converted amount if currencies differ
  let receivedAmount = amount;
  if (fromWallet.currency !== toWallet.currency) {
    const fromRate = fromWallet.exchange_rate ?? 1.0;
    const toRate = toWallet.exchange_rate ?? 1.0;
    receivedAmount = amount * fromRate / toRate;
  }
  
  // Use batch insert to create both transactions atomically
  await addTransactionsBatch([
    {
      wallet_id: fromWalletId,
      type: 'expense',
      amount: -Math.abs(amount),
      category: 'Transfer',
      date: now,
      // Include destination wallet name so UI can show "Transfer to <wallet>"
      notes: `${transferNote} to ${toWallet.name} (sent ${fromWallet.currency} ${amount.toFixed(2)})`,
    },
    {
      wallet_id: toWalletId,
      type: 'income',
      amount: Math.abs(receivedAmount),
      category: 'Transfer',
      date: now,
      // Include source wallet name so UI can show "Transfer from <wallet>"
      notes: `${transferNote} from ${fromWallet.name} (received ${toWallet.currency} ${receivedAmount.toFixed(2)})`,
    }
  ]);
}

export async function updateTransaction(id: number, t: Partial<Transaction>) {
  const fields: string[] = [];
  const params: any[] = [];
  const set = (k: string, v: any) => {
    fields.push(`${k} = ?`);
    params.push(v);
  };
  if (t.wallet_id !== undefined) set('wallet_id', t.wallet_id);
  if (t.type !== undefined) set('type', t.type);
  if (t.amount !== undefined) set('amount', t.amount);
  if (t.category !== undefined) set('category', t.category);
  if (t.date !== undefined) set('date', t.date);
  if (t.notes !== undefined) set('notes', t.notes);
  if (t.receipt_uri !== undefined) set('receipt_uri', t.receipt_uri);
  params.push(id);
  await execRun(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?;`, params);
  
  // Invalidate caches after update
  invalidateTransactionCaches();
}

export async function deleteTransaction(id: number) {
  await execRun('DELETE FROM transactions WHERE id = ?;', [id]);
  
  // Invalidate caches after delete
  invalidateTransactionCaches();
}

export async function getTransactions(page = 0, pageSize = 20) {
  const offset = page * pageSize;
  return exec<Transaction>(
    `SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ? OFFSET ?;`,
    [pageSize, offset]
  );
}

export async function getById(id: number) {
  const results = await exec<Transaction>(
    `SELECT * FROM transactions WHERE id = ?;`,
    [id]
  );
  return results[0] || null;
}

/**
 * Get wallet IDs ordered by most recent transaction date (desc)
 */
export async function getWalletsOrderedByRecentActivity(): Promise<number[]> {
  const rows = await exec<{ wallet_id: number; last_date: string }>(
    `SELECT wallet_id, MAX(date) as last_date
     FROM transactions
     GROUP BY wallet_id
     ORDER BY last_date DESC;`
  );
  return rows.map(r => r.wallet_id);
}

export async function filterTransactions(options: {
  startDate?: string;
  endDate?: string;
  walletId?: number;
  category?: string;
  type?: 'income' | 'expense';
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const where: string[] = [];
  const params: any[] = [];
  const {
    startDate,
    endDate,
    walletId,
    category,
    type,
    search,
    page = 0,
    pageSize = 20,
  } = options;
  if (startDate) {
    where.push('date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    where.push('date <= ?');
    params.push(endDate);
  }
  if (walletId) {
    where.push('wallet_id = ?');
    params.push(walletId);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (search) {
    where.push('(notes LIKE ? OR category LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const offset = page * pageSize;
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?;`;
  params.push(pageSize, offset);
  return exec<Transaction>(sql, params);
}

export async function analyticsTotalsByMonth(year: number, month: number) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();
  const income = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(t.amount * COALESCE(w.exchange_rate, 1.0)),0) as total 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'income' AND t.date BETWEEN ? AND ?;`,
    [start, end]
  );
  const expense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?;`,
    [start, end]
  );
  return { income: income[0]?.total ?? 0, expense: expense[0]?.total ?? 0 };
}

export async function analyticsCategoryBreakdown(year: number, month: number) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();
  return exec<{ category: string; total: number }>(
    `SELECT t.category, COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ? 
     GROUP BY t.category ORDER BY total DESC;`,
    [start, end]
  );
}

export async function totalAvailableAcrossWallets() {
  const cacheKey = generateCacheKey('totalAvailableAcrossWallets');
  
  return await analyticsCache.cached(cacheKey, async () => {
    // Optimized single-query approach using JOINs and aggregation
    // This replaces the N+1 query pattern with a single efficient query
    const result = await exec<{ total: number }>(
      `SELECT 
         COALESCE(
           SUM(
             (w.initial_balance + 
              COALESCE((SELECT SUM(amount) FROM transactions WHERE wallet_id = w.id AND type = 'income'), 0) + 
              COALESCE((SELECT SUM(amount) FROM transactions WHERE wallet_id = w.id AND type = 'expense'), 0)
             ) * COALESCE(w.exchange_rate, 1.0)
           ), 0
         ) as total
       FROM wallets w;`
    );
    return result[0]?.total ?? 0;
  });
}

export async function monthSpend() {
  const now = new Date();
  const cacheKey = generateCacheKey('monthSpend', now.getFullYear(), now.getMonth());
  
  return await analyticsCache.cached(cacheKey, async () => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const result = await exec<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
       FROM transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?;`,
      [start, end]
    );
    return result[0]?.total ?? 0;
  });
}

export async function todaySpend() {
  const today = new Date();
  const cacheKey = generateCacheKey('todaySpend', today.toISOString().split('T')[0]);
  
  return await analyticsCache.cached(cacheKey, async () => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
    const result = await exec<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
       FROM transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?;`,
      [start, end]
    );
    return result[0]?.total ?? 0;
  });
}

export async function categoryBreakdown() {
  const now = new Date();
  const cacheKey = generateCacheKey('categoryBreakdown', now.getFullYear(), now.getMonth());
  
  return await analyticsCache.cached(cacheKey, async () => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return exec<{ category: string; total: number }>(
      `SELECT t.category, COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
       FROM transactions t
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'expense' AND t.date BETWEEN ? AND ? AND t.category IS NOT NULL
       GROUP BY t.category ORDER BY total DESC;`,
      [start, end]
    );
  });
}

// Phase 1 Analytics: Enhanced calculations

// Helper constant for date calculations
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function weekOverWeekComparison() {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay()); // Start on Sunday
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(-1); // End of last week (just before this week starts)
  
  const thisWeekResult = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date >= ?;`,
    [thisWeekStart.toISOString()]
  );
  
  const lastWeekResult = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?;`,
    [lastWeekStart.toISOString(), lastWeekEnd.toISOString()]
  );
  
  const thisWeek = thisWeekResult[0]?.total ?? 0;
  const lastWeek = lastWeekResult[0]?.total ?? 0;
  const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  
  return { thisWeek, lastWeek, change };
}

export async function incomeVsExpenseAnalysis(period: 'current' | 'last' = 'current') {
  const now = new Date();
  const startDate = period === 'last'
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = period === 'last'
    ? new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const start = startDate.toISOString();
  const end = endDate.toISOString();
  
  const income = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(t.amount * COALESCE(w.exchange_rate, 1.0)),0) as total 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'income' AND t.date BETWEEN ? AND ?;`,
    [start, end]
  );
  const expense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?;`,
    [start, end]
  );
  
  const incomeTotal = income[0]?.total ?? 0;
  const expenseTotal = expense[0]?.total ?? 0;
  const netSavings = incomeTotal - expenseTotal;
  const savingsRate = incomeTotal > 0 ? (netSavings / incomeTotal) * 100 : 0;
  
  return { income: incomeTotal, expense: expenseTotal, netSavings, savingsRate };
}

export async function getSpendingStreak() {
  const transactions = await exec<{ date: string }>(
    `SELECT DISTINCT date FROM transactions WHERE type = 'expense' ORDER BY date DESC;`
  );
  
  if (transactions.length === 0) return { currentStreak: 0, longestStreak: 0, lastSpendDate: null };
  
  // Helper to normalize date and calculate day difference
  const getDaysDiff = (date1: Date, date2: Date): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.floor((d1.getTime() - d2.getTime()) / MS_PER_DAY);
  };
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  const today = new Date();
  
  // Check if there was spending today or yesterday for current streak
  const lastSpend = new Date(transactions[0].date);
  const daysSinceLastSpend = getDaysDiff(today, lastSpend);
  
  if (daysSinceLastSpend <= 1) {
    currentStreak = 1;
    for (let i = 0; i < transactions.length - 1; i++) {
      const current = new Date(transactions[i].date);
      const next = new Date(transactions[i + 1].date);
      const diff = getDaysDiff(current, next);
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  for (let i = 0; i < transactions.length - 1; i++) {
    const current = new Date(transactions[i].date);
    const next = new Date(transactions[i + 1].date);
    const diff = getDaysDiff(current, next);
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
  
  return { currentStreak, longestStreak, lastSpendDate: transactions[0].date };
}

export async function getMonthProgress() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const progressPercentage = (currentDay / daysInMonth) * 100;
  
  return { currentDay, daysInMonth, progressPercentage, daysRemaining: daysInMonth - currentDay };
}

export async function getTopSpendingDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  
  const result = await exec<{ date: string; total: number }>(
    `SELECT t.date, COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t
     LEFT JOIN wallets w ON t.wallet_id = w.id 
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ? 
     GROUP BY t.date 
     ORDER BY total DESC 
     LIMIT 1;`,
    [start, end]
  );
  
  return result[0] ? { date: result[0].date, total: result[0].total } : null;
}

export async function getTransactionCounts() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  
  const income = await exec<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  const expense = await exec<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  
  return { incomeCount: income[0]?.count ?? 0, expenseCount: expense[0]?.count ?? 0, total: (income[0]?.count ?? 0) + (expense[0]?.count ?? 0) };
}

export async function getAveragePurchaseSize() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  
  const result = await exec<{ avg: number; count: number }>(
    `SELECT COALESCE(AVG(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as avg, COUNT(*) as count 
     FROM transactions t
     LEFT JOIN wallets w ON t.wallet_id = w.id 
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?;`,
    [start, end]
  );
  
  return { average: result[0]?.avg ?? 0, count: result[0]?.count ?? 0 };
}

// Phase 2: Chart Data Functions

export async function getSevenDaySpendingTrend() {
  const now = new Date();
  
  // Calculate the start date (7 days ago)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  // Use a single SQL query with GROUP BY to get all daily totals at once
  // This is much more efficient than making 7 separate queries
  const result = await exec<{ date: string; total: number }>(
    `SELECT 
       DATE(t.date) as date,
       COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))), 0) as total
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date >= ?
     GROUP BY DATE(t.date)
     ORDER BY DATE(t.date) ASC;`,
    [sevenDaysAgo.toISOString()]
  );
  
  // Create a map of results for easy lookup
  const resultMap = new Map(result.map(r => [r.date, r.total]));
  
  // Build the data array with all 7 days (fill in zeros for days with no transactions)
  const data: Array<{ date: string; amount: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    
    data.push({
      date: dateStr,
      amount: resultMap.get(dateStr) ?? 0
    });
  }
  
  return data;
}

export async function getDailySpendingForMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Use a single SQL query with GROUP BY to get all daily totals at once
  const monthStart = new Date(year, month, 1, 0, 0, 0).toISOString();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  
  const result = await exec<{ date: string; total: number }>(
    `SELECT 
       DATE(t.date) as date,
       COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))), 0) as total
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?
     GROUP BY DATE(t.date)
     ORDER BY DATE(t.date) ASC;`,
    [monthStart, monthEnd]
  );
  
  // Create a map of results for easy lookup
  const resultMap = new Map(result.map(r => [r.date, r.total]));
  
  // Build the data array with all days in the month (fill in zeros for days with no transactions)
  const data: Array<{ day: number; amount: number }> = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    data.push({
      day,
      amount: resultMap.get(dateStr) ?? 0
    });
  }
  
  return data;
}

export async function getMonthlyComparison() {
  const now = new Date();
  
  // Current month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  
  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  
  // Optimize: Use a single query with CASE statements to get all 4 values at once
  // Organize parameters clearly to avoid confusion
  const params = [
    thisMonthStart, thisMonthEnd,  // For this month income
    thisMonthStart, thisMonthEnd,  // For this month expense
    lastMonthStart, lastMonthEnd,  // For last month income
    lastMonthStart, lastMonthEnd   // For last month expense
  ];
  
  const result = await exec<{ 
    this_month_income: number; 
    this_month_expense: number;
    last_month_income: number;
    last_month_expense: number;
  }>(
    `SELECT 
       COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date BETWEEN ? AND ? THEN t.amount * COALESCE(w.exchange_rate, 1.0) ELSE 0 END), 0) as this_month_income,
       COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date BETWEEN ? AND ? THEN ABS(t.amount * COALESCE(w.exchange_rate, 1.0)) ELSE 0 END), 0) as this_month_expense,
       COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date BETWEEN ? AND ? THEN t.amount * COALESCE(w.exchange_rate, 1.0) ELSE 0 END), 0) as last_month_income,
       COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date BETWEEN ? AND ? THEN ABS(t.amount * COALESCE(w.exchange_rate, 1.0)) ELSE 0 END), 0) as last_month_expense
     FROM transactions t
     LEFT JOIN wallets w ON t.wallet_id = w.id;`,
    params
  );
  
  const data = result[0] || {
    this_month_income: 0,
    this_month_expense: 0,
    last_month_income: 0,
    last_month_expense: 0
  };
  
  return {
    thisMonth: {
      income: data.this_month_income,
      expense: data.this_month_expense,
      net: data.this_month_income - data.this_month_expense
    },
    lastMonth: {
      income: data.last_month_income,
      expense: data.last_month_expense,
      net: data.last_month_income - data.last_month_expense
    }
  };
}

export async function getCategorySpendingForPieChart() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  
  const result = await exec<{ category: string; total: number }>(
    `SELECT t.category, COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t
     LEFT JOIN wallets w ON t.wallet_id = w.id 
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ? AND t.category IS NOT NULL
     GROUP BY t.category 
     ORDER BY total DESC;`,
    [start, end]
  );
  
  return result;
}

// Phase 4: Time Period Filtering Functions

export async function getSpendingTrendForPeriod(period: 'week' | 'month' | 'quarter' | 'year') {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  if (period === 'week') {
    // Reuse the optimized getSevenDaySpendingTrend function
    return await getSevenDaySpendingTrend();
  } else if (period === 'month') {
    // Last 30 days using a single GROUP BY query
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    
    const result = await exec<{ date: string; total: number }>(
      `SELECT 
         DATE(t.date) as date,
         COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))), 0) as total
       FROM transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'expense' AND t.date >= ?
       GROUP BY DATE(t.date)
       ORDER BY DATE(t.date) ASC;`,
      [thirtyDaysAgo.toISOString()]
    );
    
    // Create a map of results for easy lookup
    const resultMap = new Map(result.map(r => [r.date, r.total]));
    
    // Build the data array with all 30 days
    const dataPoints: Array<{ date: string; amount: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dataPoints.push({
        date: dateStr,
        amount: resultMap.get(dateStr) ?? 0
      });
    }
    
    return dataPoints;
  } else if (period === 'quarter') {
    // Last 12 weeks (weekly aggregation) using a single query
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - (11 * 7));
    
    const result = await exec<{ week_start: string; total: number }>(
      `SELECT 
         DATE(t.date, 'weekday 0', '-6 days') as week_start,
         COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))), 0) as total
       FROM transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'expense' AND t.date >= ?
       GROUP BY week_start
       ORDER BY week_start ASC;`,
      [twelveWeeksAgo.toISOString()]
    );
    
    // Create a map of results for easy lookup
    const resultMap = new Map(result.map(r => [r.week_start, r.total]));
    
    // Build the data array with all 12 weeks
    const dataPoints: Array<{ date: string; amount: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - (i * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      const dateStr = startDate.toISOString().split('T')[0];
      
      dataPoints.push({
        date: endDate.toISOString().split('T')[0],
        amount: resultMap.get(dateStr) ?? 0
      });
    }
    
    return dataPoints;
  } else if (period === 'year') {
    // Last 12 months (monthly aggregation) using a single query
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    
    const result = await exec<{ month: string; total: number }>(
      `SELECT 
         strftime('%Y-%m', t.date) as month,
         COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))), 0) as total
       FROM transactions t 
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.type = 'expense' AND t.date >= ?
       GROUP BY month
       ORDER BY month ASC;`,
      [twelveMonthsAgo.toISOString()]
    );
    
    // Create a map of results for easy lookup
    const resultMap = new Map(result.map(r => [r.month, r.total]));
    
    // Build the data array with all 12 months
    const dataPoints: Array<{ date: string; amount: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      
      dataPoints.push({
        date: date.toISOString().split('T')[0],
        amount: resultMap.get(monthKey) ?? 0
      });
    }
    
    return dataPoints;
  }
  
  return [];
}

export async function getCategorySpendingForPeriod(period: 'week' | 'month' | 'quarter' | 'year') {
  const now = new Date();
  let startDate: Date;
  
  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 3);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }
  
  const start = startDate.toISOString();
  const end = now.toISOString();
  
  const result = await exec<{ category: string; total: number }>(
    `SELECT t.category, COALESCE(SUM(ABS(t.amount * COALESCE(w.exchange_rate, 1.0))),0) as total 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.date BETWEEN ? AND ? AND t.category IS NOT NULL
     GROUP BY t.category 
     ORDER BY total DESC;`,
    [start, end]
  );
  
  return result;
}

export async function getTransactionsByCategory(category: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  const now = new Date();
  let startDate: Date;
  
  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 3);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }
  
  const start = startDate.toISOString();
  const end = now.toISOString();
  
  const result = await exec<{ id: number; amount: number; date: string; notes: string | null }>(
    `SELECT t.id, t.amount * COALESCE(w.exchange_rate, 1.0) as amount, t.date, t.notes 
     FROM transactions t 
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.type = 'expense' AND t.category = ? AND t.date BETWEEN ? AND ?
     ORDER BY t.date DESC;`,
    [category, start, end]
  );
  
  return result;
}
