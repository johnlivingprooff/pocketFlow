/**
 * Integration Test: Transaction Persistence
 * 
 * This test verifies that transactions saved via addTransaction are durably stored
 * in the database.
 */

import { getDb } from '../src/lib/db';
import { addTransaction, getTransactions } from '../src/lib/db/transactions';
import { createWallet } from '../src/lib/db/wallets';
import { Transaction } from '../src/types/transaction';
import { Wallet } from '../src/types/wallet';

function resetTestDb(): void {
  const db = getDb();
  db.transaction(tx => {
    tx.execute('DELETE FROM transactions;');
    tx.execute('DELETE FROM wallets;');
    tx.execute('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets");');
  });
}

describe('Transaction Persistence Test Suite', () => {

  beforeEach(() => {
    resetTestDb();
  });

  test('Transaction persists after being added', () => {
    // Step 1: Create a test wallet
    const testWallet: Wallet = {
      id: undefined,
      name: 'Test Wallet',
      currency: 'MWK',
      initial_balance: 1000,
      type: 'cash',
      color: '#FF5733',
      created_at: new Date().toISOString(),
      is_primary: 1,
      exchange_rate: 1.0,
      display_order: 0,
    };

    createWallet(testWallet);

    const db = getDb();
    const walletResult = db.getAll<{ id: number }>(
      'SELECT id FROM wallets WHERE name = ?;',
      ['Test Wallet']
    );

    if (walletResult.length === 0) {
      throw new Error('Failed to create test wallet');
    }

    const walletId = walletResult[0].id;

    // Step 2: Add a transaction
    const testTransaction: Transaction = {
      wallet_id: walletId,
      type: 'expense',
      amount: -150,
      category: 'Food',
      date: new Date().toISOString(),
      notes: 'Test transaction for persistence',
      receipt_uri: undefined,
      is_recurring: 0,
      recurrence_frequency: undefined,
      recurrence_end_date: undefined,
      parent_transaction_id: undefined,
    };

    addTransaction(testTransaction);

    // Step 3: Verify transaction exists immediately after add
    const transactionsAfterAdd = getTransactions(0, 10);
    if (transactionsAfterAdd.length === 0) {
      throw new Error('Transaction not found immediately after adding');
    }

    const addedTransaction = transactionsAfterAdd[0];
    expect(addedTransaction).toBeDefined();
    expect(addedTransaction.amount).toBe(-150);
    expect(addedTransaction.category).toBe('Food');
    expect(addedTransaction.notes).toBe('Test transaction for persistence');
  });

  test('Multiple transactions persist', () => {
    // Step 1: Create test wallet
    const testWallet: Wallet = {
      id: undefined,
      name: 'Multi-Transaction Wallet',
      currency: 'MWK',
      initial_balance: 5000,
      type: 'cash',
      color: '#33FF57',
      created_at: new Date().toISOString(),
      is_primary: 0,
      exchange_rate: 1.0,
      display_order: 1,
    };

    createWallet(testWallet);

    const db = getDb();
    const walletResult = db.getAll<{ id: number }>(
      'SELECT id FROM wallets WHERE name = ?;',
      ['Multi-Transaction Wallet']
    );

    const walletId = walletResult[0].id;

    // Step 2: Add multiple transactions
    for (let i = 0; i < 5; i++) {
      const transaction: Transaction = {
        wallet_id: walletId,
        type: i % 2 === 0 ? 'expense' : 'income',
        amount: i % 2 === 0 ? -(50 + i * 10) : 100 + i * 20,
        category: i % 2 === 0 ? 'Food' : 'Salary',
        date: new Date(Date.now() - i * 86400000).toISOString(), // Each day before today
        notes: `Transaction ${i}`,
        receipt_uri: undefined,
        is_recurring: 0,
        recurrence_frequency: undefined,
        recurrence_end_date: undefined,
        parent_transaction_id: undefined,
      };

      addTransaction(transaction);
    }

    // Step 3: Verify all transactions persist
    const persistedCount = db.getAll<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE wallet_id = ?;`,
      [walletId]
    );

    const count = persistedCount[0]?.count || 0;

    if (count !== 5) {
      throw new Error(
        `PERSISTENCE FAILURE: Expected 5 transactions, but found ${count}`
      );
    }
  });
});
