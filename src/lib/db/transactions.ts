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
