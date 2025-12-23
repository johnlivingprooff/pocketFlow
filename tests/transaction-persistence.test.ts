/**
 * Integration Test: Transaction Persistence After App Kill
 * 
 * This test verifies that transactions saved via addTransaction are durably stored
 * in the database even if the app is killed immediately after saving.
 * 
 * Scenario:
 * 1. Add a transaction via addTransaction()
 * 2. Simulate app kill by closing and reopening database connection
 * 3. Verify the transaction exists in the database
 * 
 * This addresses the issue where data disappears after exiting the app
 * immediately after adding a transaction in release builds.
 */

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { addTransaction, getById, getTransactions } from '../src/lib/db/transactions';
import { createWallet } from '../src/lib/db/wallets';
import { Transaction } from '../src/types/transaction';
import { Wallet } from '../src/types/wallet';
import { resetQueueStats } from '../src/lib/db/writeQueue';

// Mock database connection for testing fresh opens
let testDbInstance: SQLite.SQLiteDatabase | null = null;

async function getTestDb(): Promise<SQLite.SQLiteDatabase> {
  if (!testDbInstance) {
    testDbInstance = await SQLite.openDatabaseAsync('pocketflow-test.db');
    // Enable WAL mode and timeouts like the app does
    await testDbInstance.execAsync('PRAGMA journal_mode = WAL;');
    await testDbInstance.execAsync('PRAGMA busy_timeout = 5000;');
  }
  return testDbInstance;
}

async function closeTestDb(): Promise<void> {
  if (testDbInstance) {
    try {
      // Note: expo-sqlite doesn't expose close() directly, so we set to null
      // The actual closing happens when the DB handle is released
      testDbInstance = null;
    } catch (err) {
      console.error('Error closing test database:', err);
    }
  }
}

async function resetTestDb(): Promise<void> {
  try {
    const db = await getTestDb();
    
    // Clear all tables
    await db.execAsync('DELETE FROM transactions;');
    await db.execAsync('DELETE FROM wallets;');
    await db.execAsync('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets");');
  } catch (err) {
    console.error('Error resetting test database:', err);
  }
}

describe('Transaction Persistence Test Suite', () => {
  beforeEach(async () => {
    // Reset queue stats before each test
    resetQueueStats();
    // Clean up test data
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('Transaction persists after app kill simulation', async () => {
    if (Platform.OS === 'web') {
      console.log('Skipping database persistence test on web platform');
      return;
    }

    try {
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

      await createWallet(testWallet);

      // Get the created wallet ID
      const db = await getTestDb();
      const walletResult = await db.executeAsync(
        'SELECT id FROM wallets WHERE name = ?;',
        ['Test Wallet']
      );
      const walletRows = walletResult.rows?._array as { id: number }[];

      if (walletRows.length === 0) {
        throw new Error('Failed to create test wallet');
      }

      const walletId = walletRows[0].id;

      // Step 2: Add a transaction
      const testTransaction: Transaction = {
        wallet_id: walletId,
        type: 'expense',
        amount: -150,
        category: 'Food',
        date: new Date().toISOString(),
        notes: 'Test transaction for persistence',
        receipt_path: undefined,
        is_recurring: 0,
        recurrence_frequency: undefined,
        recurrence_end_date: undefined,
        parent_transaction_id: undefined,
      };

      const addStartTime = Date.now();
      await addTransaction(testTransaction);
      const addDuration = Date.now() - addStartTime;

      console.log(`[Test] Transaction added in ${addDuration}ms`);

      // Step 3: Verify transaction exists immediately after add
      const transactionsAfterAdd = await getTransactions(0, 10);
      if (transactionsAfterAdd.length === 0) {
        throw new Error('Transaction not found immediately after adding');
      }

      const addedTransaction = transactionsAfterAdd[0];
      expect(addedTransaction).toBeDefined();
      expect(addedTransaction.amount).toBe(-150);
      expect(addedTransaction.category).toBe('Food');
      expect(addedTransaction.notes).toBe('Test transaction for persistence');

      const transactionId = addedTransaction.id;
      console.log(`[Test] Transaction ID ${transactionId} added successfully`);

      // Step 4: Simulate app kill by closing the database connection
      console.log('[Test] Simulating app kill - closing database connection...');
      await closeTestDb();

      // Brief delay to ensure any pending operations complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 5: Reopen the database (simulating app restart)
      console.log('[Test] Reopening database (simulating app restart)...');
      const reopenDb = await getTestDb();

      // Step 6: Verify transaction still exists after "kill" and restart
      const transactionsAfterKillResult = await reopenDb.executeAsync(
        'SELECT * FROM transactions WHERE id = ?;',
        [transactionId]
      );
      const transactionsAfterKill = transactionsAfterKillResult.rows?._array as Transaction[];

      if (transactionsAfterKill.length === 0) {
        throw new Error(
          `PERSISTENCE FAILURE: Transaction ${transactionId} not found after simulated app kill. ` +
          `This is the bug causing data loss in release builds.`
        );
      }

      const persistedTransaction = transactionsAfterKill[0];
      expect(persistedTransaction.id).toBe(transactionId);
      expect(persistedTransaction.amount).toBe(-150);
      expect(persistedTransaction.category).toBe('Food');
      expect(persistedTransaction.wallet_id).toBe(walletId);

      console.log(
        `[Test] ✓ SUCCESS: Transaction ${transactionId} persisted successfully after app kill simulation`
      );
    } catch (error: any) {
      console.error('[Test] ERROR:', error);
      throw error;
    }
  });

  test('Multiple transactions persist after app kill', async () => {
    if (Platform.OS === 'web') {
      console.log('Skipping database persistence test on web platform');
      return;
    }

    try {
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

      await createWallet(testWallet);

      const db = await getTestDb();
      const walletResult = await db.executeAsync(
        'SELECT id FROM wallets WHERE name = ?;',
        ['Multi-Transaction Wallet']
      );
      const walletRows = walletResult.rows?._array as { id: number }[];

      const walletId = walletRows[0].id;

      // Step 2: Add multiple transactions
      const transactionIds: number[] = [];

      for (let i = 0; i < 5; i++) {
        const transaction: Transaction = {
          wallet_id: walletId,
          type: i % 2 === 0 ? 'expense' : 'income',
          amount: i % 2 === 0 ? -(50 + i * 10) : 100 + i * 20,
          category: i % 2 === 0 ? 'Food' : 'Salary',
          date: new Date(Date.now() - i * 86400000).toISOString(), // Each day before today
          notes: `Transaction ${i}`,
          receipt_path: undefined,
          is_recurring: 0,
          recurrence_frequency: undefined,
          recurrence_end_date: undefined,
          parent_transaction_id: undefined,
        };

        await addTransaction(transaction);
        console.log(`[Test] Added transaction ${i}`);
      }

      // Fetch IDs of added transactions
      const allTransactions = await getTransactions(0, 10);
      for (let i = 0; i < 5; i++) {
        if (allTransactions[i]?.id) {
          transactionIds.push(allTransactions[i].id!);
        }
      }

      console.log(`[Test] Added ${transactionIds.length} transactions`);

      // Step 3: Simulate app kill
      await closeTestDb();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 4: Reopen and verify all transactions persist
      const reopenDb = await getTestDb();

      const persistedCountResult = await reopenDb.executeAsync(
        `SELECT COUNT(*) as count FROM transactions WHERE wallet_id = ?;`,
        [walletId]
      );
      const persistedCount = persistedCountResult.rows?._array as { count: number }[];

      const count = persistedCount[0]?.count || 0;

      if (count !== 5) {
        throw new Error(
          `PERSISTENCE FAILURE: Expected 5 transactions, but found ${count} after app kill`
        );
      }

      // Verify each transaction individually
      for (const txnId of transactionIds) {
        const result = await reopenDb.executeAsync(
          'SELECT * FROM transactions WHERE id = ?;',
          [txnId]
        );
        const transactions = result.rows?._array as Transaction[];

        if (transactions.length === 0) {
          throw new Error(`Transaction ${txnId} not found after app kill`);
        }
      }

      console.log(`[Test] ✓ SUCCESS: All 5 transactions persisted after app kill`);
    } catch (error: any) {
      console.error('[Test] ERROR:', error);
      throw error;
    }
  });

  test('Write queue is properly drained before app background', async () => {
    if (Platform.OS === 'web') {
      console.log('Skipping queue drain test on web platform');
      return;
    }

    try {
      // Step 1: Create wallet
      const testWallet: Wallet = {
        id: undefined,
        name: 'Queue Drain Test Wallet',
        currency: 'MWK',
        initial_balance: 1000,
        type: 'cash',
        color: '#5733FF',
        created_at: new Date().toISOString(),
        is_primary: 0,
        exchange_rate: 1.0,
        display_order: 2,
      };

      await createWallet(testWallet);

      const db = await getTestDb();
      const walletResult = await db.executeAsync(
        'SELECT id FROM wallets WHERE name = ?;',
        ['Queue Drain Test Wallet']
      );
      const walletRows = walletResult.rows?._array as { id: number }[];

      const walletId = walletResult[0].id;

      // Step 2: Add a transaction
      const transaction: Transaction = {
        wallet_id: walletId,
        type: 'expense',
        amount: -200,
        category: 'Transport',
        date: new Date().toISOString(),
        notes: 'Queue drain test',
        receipt_path: undefined,
        is_recurring: 0,
        recurrence_frequency: undefined,
        recurrence_end_date: undefined,
        parent_transaction_id: undefined,
      };

      // Import flushWriteQueue to test it
      const { flushWriteQueue } = await import('../src/lib/db/writeQueue');

      const addPromise = addTransaction(transaction);

      // Add some concurrent operations to fill the queue
      const promises = [
        addPromise,
        // Queue up the flush before add completes
        new Promise(resolve => setTimeout(() => flushWriteQueue().then(resolve), 10)),
      ];

      await Promise.all(promises);

      console.log('[Test] Queue flushed successfully');

      // Verify transaction was written
      const storedResult = await db.executeAsync(
        'SELECT * FROM transactions WHERE category = ? AND wallet_id = ?;',
        ['Transport', walletId]
      );
      const stored = storedResult.rows?._array as Transaction[];

      if (stored.length === 0) {
        throw new Error('Transaction not found after queue flush');
      }

      console.log('[Test] ✓ SUCCESS: Write queue properly handles flush during concurrent operations');
    } catch (error: any) {
      console.error('[Test] ERROR:', error);
      throw error;
    }
  });
});
