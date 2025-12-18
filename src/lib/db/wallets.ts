import { getDb } from './index';
import { Wallet } from '../../types/wallet';

export function getWallet(id: number): Wallet[] {
  const database = getDb();
  const rows = database.execute('SELECT * FROM wallets WHERE id = ?;', [id]).rows?._array ?? [];
  // Defensive: filter to only valid Wallet objects (with numeric id)
  return rows.filter(row => typeof row.id === 'number') as unknown as Wallet[];
}

export function setPrimaryWallet(id: number) {
  const database = getDb();
  database.execute('UPDATE wallets SET is_primary = 0;');
  database.execute('UPDATE wallets SET is_primary = 1 WHERE id = ?;', [id]);
}

export function getWalletBalance(id: number): number {
  const database = getDb();
  const incomeRows = database.execute('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = "income";', [id]).rows?._array ?? [];
  const expenseRows = database.execute('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id = ? AND type = "expense";', [id]).rows?._array ?? [];
  const w = getWallet(id);
  const initial = typeof w[0]?.initial_balance === 'number' ? w[0].initial_balance : 0;
  const income = incomeRows[0]?.total;
  const expense = expenseRows[0]?.total;
  const incomeNum = typeof income === 'number' ? income : Number(income) || 0;
  const expenseNum = typeof expense === 'number' ? expense : Number(expense) || 0;
  return initial + incomeNum + expenseNum;
}

/**
 * Get balances for multiple wallets efficiently in a single query
 * This avoids N+1 query problems when fetching all wallet balances
 * @param walletIds - Array of wallet IDs to fetch balances for
 * @returns Record mapping wallet ID to balance
 */
export function getWalletBalances(walletIds: number[]): Record<number, number> {
  if (walletIds.length === 0) {
    return {};
  }
  const database = getDb();
  const placeholders = walletIds.map(() => '?').join(',');
  const walletsRows = database.execute(`SELECT id, initial_balance FROM wallets WHERE id IN (${placeholders});`, walletIds).rows?._array ?? [];
  const transactionSumsRows = database.execute(`SELECT wallet_id, type, COALESCE(SUM(amount), 0) as total FROM transactions WHERE wallet_id IN (${placeholders}) GROUP BY wallet_id, type;`, walletIds).rows?._array ?? [];
  const balances: Record<number, number> = {};
  for (const wallet of walletsRows) {
    const id = typeof wallet.id === 'number' ? wallet.id : Number(wallet.id);
    if (typeof id === 'number' && !isNaN(id)) {
      balances[id] = typeof wallet.initial_balance === 'number' ? wallet.initial_balance : Number(wallet.initial_balance) || 0;
    }
  }
  for (const sum of transactionSumsRows) {
    const id = typeof sum.wallet_id === 'number' ? sum.wallet_id : Number(sum.wallet_id);
    if (typeof id === 'number' && !isNaN(id)) {
      const total = typeof sum.total === 'number' ? sum.total : Number(sum.total) || 0;
      balances[id] = (balances[id] ?? 0) + total;
    }
  }
    return balances;
  }


/**
 * Get wallet balance converted to default currency using exchange rate
 * @param id - Wallet ID
 * @param defaultCurrency - Default currency (optional, for validation)
 */
export function getWalletBalanceInDefaultCurrency(id: number, defaultCurrency?: string): number {
  const balance = getWalletBalance(id);
  const w = getWallet(id);
  const wallet = w[0];
  if (!wallet) return 0;
  const exchangeRate = wallet.exchange_rate ?? 1.0;
  return balance * exchangeRate;
}
