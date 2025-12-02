import { exec, execRun } from './index';
import { Wallet } from '../../types/wallet';

export async function createWallet(w: Wallet) {
  const params = [
    w.name,
    w.currency,
    w.initial_balance ?? 0,
    w.type,
    w.color ?? null,
    (w as any).description ?? null,
    new Date().toISOString(),
    w.is_primary ?? 0,
  ];
  await execRun(
    `INSERT INTO wallets (name, currency, initial_balance, type, color, description, created_at, is_primary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    params
  );
}

export async function updateWallet(id: number, w: Partial<Wallet>) {
  const fields: string[] = [];
  const params: any[] = [];
  const set = (k: string, v: any) => {
    fields.push(`${k} = ?`);
    params.push(v);
  };
  if (w.name !== undefined) set('name', w.name);
  if (w.currency !== undefined) set('currency', w.currency);
  if (w.initial_balance !== undefined) set('initial_balance', w.initial_balance);
  if (w.type !== undefined) set('type', w.type);
  if (w.color !== undefined) set('color', w.color);
  if (w.is_primary !== undefined) set('is_primary', w.is_primary);
  params.push(id);
  await execRun(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ?;`, params);
}

export async function deleteWallet(id: number) {
  await execRun('DELETE FROM wallets WHERE id = ?;', [id]);
}

export async function getWallets(): Promise<Wallet[]> {
  return exec<Wallet>('SELECT * FROM wallets ORDER BY created_at DESC;');
}

export async function getWallet(id: number): Promise<Wallet[]> {
  return exec<Wallet>('SELECT * FROM wallets WHERE id = ?;', [id]);
}

export async function setPrimaryWallet(id: number) {
  await execRun('UPDATE wallets SET is_primary = 0;');
  await execRun('UPDATE wallets SET is_primary = 1 WHERE id = ?;', [id]);
}

export async function getWalletBalance(id: number): Promise<number> {
  const income = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = 'income';`,
    [id]
  );
  const expense = await exec<{ total: number }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = 'expense';`,
    [id]
  );
  const w = await getWallet(id);
  const initial = w[0]?.initial_balance ?? 0;
  // Expenses are stored as negative, so we add them (they're already negative)
  return initial + (income[0]?.total ?? 0) + (expense[0]?.total ?? 0);
}
