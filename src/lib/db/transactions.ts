import { exec, execRun } from './index';
import { Transaction } from '../../types/transaction';

export async function addTransaction(t: Transaction) {
  const params = [
    t.wallet_id,
    t.type,
    t.amount,
    t.category ?? null,
    t.date,
    t.notes ?? null,
    t.receipt_uri ?? null,
  ];
  await execRun(
    `INSERT INTO transactions (wallet_id, type, amount, category, date, notes, receipt_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    params
  );
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
}

export async function deleteTransaction(id: number) {
  await execRun('DELETE FROM transactions WHERE id = ?;', [id]);
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
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  const expense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  return { income: income[0]?.total ?? 0, expense: expense[0]?.total ?? 0 };
}

export async function analyticsCategoryBreakdown(year: number, month: number) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();
  return exec<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount),0) as total 
     FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ? 
     GROUP BY category ORDER BY total DESC;`,
    [start, end]
  );
}

export async function totalAvailableAcrossWallets() {
  const wallets = await exec<{ id: number; initial_balance: number }>(
    'SELECT id, initial_balance FROM wallets;'
  );
  let total = 0;
  for (const w of wallets) {
    const inc = await exec<{ total: number }>(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = 'income';`,
      [w.id]
    );
    const exp = await exec<{ total: number }>(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = 'expense';`,
      [w.id]
    );
    total += w.initial_balance + (inc[0]?.total ?? 0) - (exp[0]?.total ?? 0);
  }
  return total;
}

export async function monthSpend() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const result = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  return result[0]?.total ?? 0;
}

export async function todaySpend() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  const result = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  return result[0]?.total ?? 0;
}

export async function categoryBreakdown() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return exec<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount),0) as total 
     FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ? AND category IS NOT NULL
     GROUP BY category ORDER BY total DESC;`,
    [start, end]
  );
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
  lastWeekEnd.setHours(0, 0, 0, -1); // End of last week (just before this week starts)
  
  const thisWeekResult = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date >= ?;`,
    [thisWeekStart.toISOString()]
  );
  
  const lastWeekResult = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [lastWeekStart.toISOString(), lastWeekEnd.toISOString()]
  );
  
  const thisWeek = thisWeekResult[0]?.total ?? 0;
  const lastWeek = lastWeekResult[0]?.total ?? 0;
  const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  
  return { thisWeek, lastWeek, change };
}

export async function incomeVsExpenseAnalysis() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  
  const income = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  const expense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
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
    `SELECT date, COALESCE(SUM(amount),0) as total 
     FROM transactions 
     WHERE type = 'expense' AND date BETWEEN ? AND ? 
     GROUP BY date 
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
    `SELECT COALESCE(AVG(amount),0) as avg, COUNT(*) as count 
     FROM transactions 
     WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [start, end]
  );
  
  return { average: result[0]?.avg ?? 0, count: result[0]?.count ?? 0 };
}

// Phase 2: Chart Data Functions

export async function getSevenDaySpendingTrend() {
  const now = new Date();
  const data: Array<{ date: string; amount: number }> = [];
  
  // Get spending for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
    
    const result = await exec<{ total: number }>(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
      [startOfDay, endOfDay]
    );
    
    data.push({
      date: date.toISOString().split('T')[0],
      amount: result[0]?.total ?? 0
    });
  }
  
  return data;
}

export async function getDailySpendingForMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const data: Array<{ day: number; amount: number }> = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const startOfDay = new Date(year, month, day, 0, 0, 0).toISOString();
    const endOfDay = new Date(year, month, day, 23, 59, 59).toISOString();
    
    const result = await exec<{ total: number }>(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
      [startOfDay, endOfDay]
    );
    
    data.push({
      day,
      amount: result[0]?.total ?? 0
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
  
  const thisMonthIncome = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ?;`,
    [thisMonthStart, thisMonthEnd]
  );
  const thisMonthExpense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [thisMonthStart, thisMonthEnd]
  );
  
  const lastMonthIncome = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ?;`,
    [lastMonthStart, lastMonthEnd]
  );
  const lastMonthExpense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
    [lastMonthStart, lastMonthEnd]
  );
  
  return {
    thisMonth: {
      income: thisMonthIncome[0]?.total ?? 0,
      expense: thisMonthExpense[0]?.total ?? 0,
      net: (thisMonthIncome[0]?.total ?? 0) - (thisMonthExpense[0]?.total ?? 0)
    },
    lastMonth: {
      income: lastMonthIncome[0]?.total ?? 0,
      expense: lastMonthExpense[0]?.total ?? 0,
      net: (lastMonthIncome[0]?.total ?? 0) - (lastMonthExpense[0]?.total ?? 0)
    }
  };
}

export async function getCategorySpendingForPieChart() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  
  const result = await exec<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount),0) as total 
     FROM transactions 
     WHERE type = 'expense' AND date BETWEEN ? AND ? AND category IS NOT NULL
     GROUP BY category 
     ORDER BY total DESC;`,
    [start, end]
  );
  
  return result;
}

// Phase 4: Time Period Filtering Functions

export async function getSpendingTrendForPeriod(period: 'week' | 'month' | 'quarter' | 'year') {
  const now = new Date();
  let dataPoints: Array<{ date: string; amount: number }> = [];
  
  if (period === 'week') {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
      
      const result = await exec<{ total: number }>(
        `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
        [startOfDay, endOfDay]
      );
      
      dataPoints.push({
        date: date.toISOString().split('T')[0],
        amount: result[0]?.total ?? 0
      });
    }
  } else if (period === 'month') {
    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
      
      const result = await exec<{ total: number }>(
        `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
        [startOfDay, endOfDay]
      );
      
      dataPoints.push({
        date: date.toISOString().split('T')[0],
        amount: result[0]?.total ?? 0
      });
    }
  } else if (period === 'quarter') {
    // Last 3 months (weekly aggregation)
    for (let i = 11; i >= 0; i--) {
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - (i * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      
      const result = await exec<{ total: number }>(
        `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
        [startDate.toISOString(), endDate.toISOString()]
      );
      
      dataPoints.push({
        date: endDate.toISOString().split('T')[0],
        amount: result[0]?.total ?? 0
      });
    }
  } else if (period === 'year') {
    // Last 12 months (monthly aggregation)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = date.toISOString();
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      const result = await exec<{ total: number }>(
        `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?;`,
        [startOfMonth, endOfMonth]
      );
      
      dataPoints.push({
        date: startOfMonth.split('T')[0],
        amount: result[0]?.total ?? 0
      });
    }
  }
  
  return dataPoints;
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
    `SELECT category, COALESCE(SUM(amount),0) as total 
     FROM transactions 
     WHERE type = 'expense' AND date BETWEEN ? AND ? AND category IS NOT NULL
     GROUP BY category 
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
    `SELECT id, amount, date, notes 
     FROM transactions 
     WHERE type = 'expense' AND category = ? AND date BETWEEN ? AND ?
     ORDER BY date DESC;`,
    [category, start, end]
  );
  
  return result;
}
