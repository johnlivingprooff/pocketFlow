/**
 * Comprehensive wallet reorder test suite
 * Tests that wallet reordering doesn't break subsequent database operations
 * 
 * These tests verify:
 * 1. Basic reorder functionality works correctly
 * 2. Subsequent wallet operations work after reorder
 * 3. Subsequent category operations work after reorder
 * 4. Subsequent transaction operations work after reorder
 * 5. Subsequent transfer operations work after reorder
 * 6. Edge cases (empty list, single wallet, rapid reorders)
 * 7. Concurrent operations (reorder + create simultaneously)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDb, ensureTables, clearDatabase } from '../src/lib/db/index';
import { 
  createWallet, 
  getWallets, 
  updateWalletsOrder,
  deleteWallet,
  updateWallet,
} from '../src/lib/db/wallets';
import { addTransaction, getTransactions } from '../src/lib/db/transactions';
import { createCategory, getCategories } from '../src/lib/db/categories';
import { Wallet } from '../src/types/wallet';
import { Transaction } from '../src/types/transaction';

describe('Wallet Reorder Comprehensive Tests', () => {
  
  beforeEach(async () => {
    // Initialize database and ensure tables exist
    await ensureTables();
    // Clear all data to start with clean state
    await clearDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    await clearDatabase();
  });

  describe('Phase 1: Basic Reorder Functionality', () => {
    
    it('should reorder wallets and persist the order correctly', async () => {
      // Create 3 wallets
      const wallet1: Wallet = { 
        name: 'Wallet A', 
        currency: 'USD', 
        initial_balance: 100,
        type: 'cash'
      };
      const wallet2: Wallet = { 
        name: 'Wallet B', 
        currency: 'USD', 
        initial_balance: 200,
        type: 'bank'
      };
      const wallet3: Wallet = { 
        name: 'Wallet C', 
        currency: 'USD', 
        initial_balance: 300,
        type: 'card'
      };

      await createWallet(wallet1);
      await createWallet(wallet2);
      await createWallet(wallet3);

      // Get wallets and verify initial order
      let wallets = await getWallets();
      expect(wallets).toHaveLength(3);
      expect(wallets[0].name).toBe('Wallet A');
      expect(wallets[1].name).toBe('Wallet B');
      expect(wallets[2].name).toBe('Wallet C');
      
      // Verify display_order is sequential
      expect(wallets[0].display_order).toBe(0);
      expect(wallets[1].display_order).toBe(1);
      expect(wallets[2].display_order).toBe(2);

      // Reorder: move Wallet C to position 0 (C, A, B)
      const reorderUpdates = [
        { id: wallets[2].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
        { id: wallets[1].id!, display_order: 2 },
      ];
      
      await updateWalletsOrder(reorderUpdates);

      // Verify new order
      wallets = await getWallets();
      expect(wallets).toHaveLength(3);
      expect(wallets[0].name).toBe('Wallet C');
      expect(wallets[1].name).toBe('Wallet A');
      expect(wallets[2].name).toBe('Wallet B');
      
      // Verify display_order is still sequential
      expect(wallets[0].display_order).toBe(0);
      expect(wallets[1].display_order).toBe(1);
      expect(wallets[2].display_order).toBe(2);
    });

    it('should maintain sequential display_order after multiple reorders', async () => {
      // Create 5 wallets
      for (let i = 1; i <= 5; i++) {
        await createWallet({
          name: `Wallet ${i}`,
          currency: 'USD',
          initial_balance: i * 100,
          type: 'cash'
        });
      }

      // Perform 3 different reorders
      let wallets = await getWallets();
      
      // First reorder: reverse order
      await updateWalletsOrder(
        wallets.reverse().map((w, idx) => ({ id: w.id!, display_order: idx }))
      );

      // Second reorder: move first to last
      wallets = await getWallets();
      const first = wallets.shift()!;
      wallets.push(first);
      await updateWalletsOrder(
        wallets.map((w, idx) => ({ id: w.id!, display_order: idx }))
      );

      // Third reorder: shuffle randomly
      wallets = await getWallets();
      const shuffled = [wallets[2], wallets[0], wallets[4], wallets[1], wallets[3]];
      await updateWalletsOrder(
        shuffled.map((w, idx) => ({ id: w.id!, display_order: idx }))
      );

      // Verify final state has sequential display_order with no gaps
      wallets = await getWallets();
      expect(wallets).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(wallets[i].display_order).toBe(i);
      }
    });
  });

  describe('Phase 2: Subsequent Wallet Operations After Reorder', () => {
    
    it('should allow wallet creation after reorder', async () => {
      // Create 2 wallets and reorder them
      await createWallet({ name: 'Wallet A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'Wallet B', currency: 'USD', initial_balance: 200, type: 'bank' });
      
      let wallets = await getWallets();
      await updateWalletsOrder([
        { id: wallets[1].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
      ]);

      // Create a new wallet after reorder
      await createWallet({ name: 'Wallet C', currency: 'USD', initial_balance: 300, type: 'card' });

      // Verify new wallet was added with correct display_order
      wallets = await getWallets();
      expect(wallets).toHaveLength(3);
      expect(wallets[2].name).toBe('Wallet C');
      expect(wallets[2].display_order).toBe(2);
    });

    it('should allow wallet update after reorder', async () => {
      await createWallet({ name: 'Wallet A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'Wallet B', currency: 'USD', initial_balance: 200, type: 'bank' });
      
      let wallets = await getWallets();
      await updateWalletsOrder([
        { id: wallets[1].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
      ]);

      // Update wallet after reorder
      await updateWallet(wallets[0].id!, { name: 'Updated Wallet A' });

      wallets = await getWallets();
      const updatedWallet = wallets.find(w => w.id === wallets[0].id);
      expect(updatedWallet?.name).toBe('Updated Wallet A');
    });

    it('should allow wallet deletion after reorder', async () => {
      await createWallet({ name: 'Wallet A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'Wallet B', currency: 'USD', initial_balance: 200, type: 'bank' });
      await createWallet({ name: 'Wallet C', currency: 'USD', initial_balance: 300, type: 'card' });
      
      let wallets = await getWallets();
      const idToDelete = wallets[1].id!;
      
      await updateWalletsOrder([
        { id: wallets[2].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
        { id: wallets[1].id!, display_order: 2 },
      ]);

      // Delete wallet after reorder
      await deleteWallet(idToDelete);

      wallets = await getWallets();
      expect(wallets).toHaveLength(2);
    });
  });

  describe('Phase 3: Subsequent Category Operations After Reorder', () => {
    
    it('should allow category creation after wallet reorder', async () => {
      await createWallet({ name: 'Wallet A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'Wallet B', currency: 'USD', initial_balance: 200, type: 'bank' });
      
      let wallets = await getWallets();
      await updateWalletsOrder([
        { id: wallets[1].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
      ]);

      // Create category after reorder
      const categoryId = await createCategory({
        name: 'Test Category',
        type: 'expense',
        icon: '📝',
      });

      expect(categoryId).toBeGreaterThan(0);

      const categories = await getCategories('expense');
      const testCategory = categories.find(c => c.name === 'Test Category');
      expect(testCategory).toBeDefined();
      expect(testCategory?.icon).toBe('📝');
    });
  });

  describe('Phase 4: Subsequent Transaction Operations After Reorder', () => {
    
    it('should allow transaction creation after wallet reorder', async () => {
      await createWallet({ name: 'Wallet A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'Wallet B', currency: 'USD', initial_balance: 200, type: 'bank' });
      
      let wallets = await getWallets();
      const walletAId = wallets[0].id!;
      
      await updateWalletsOrder([
        { id: wallets[1].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
      ]);

      // Create transaction after reorder
      const transaction: Transaction = {
        wallet_id: walletAId,
        type: 'expense',
        amount: -50,
        category: 'Food',
        date: new Date().toISOString(),
        notes: 'Test transaction after reorder',
      };

      await addTransaction(transaction);

      const transactions = await getTransactions({ walletId: walletAId });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].notes).toBe('Test transaction after reorder');
    });
  });

  describe('Phase 5: Edge Cases', () => {
    
    it('should handle reorder with empty list gracefully', async () => {
      // No wallets created
      const wallets = await getWallets();
      expect(wallets).toHaveLength(0);

      // Attempt to reorder empty list (should not throw)
      await updateWalletsOrder([]);
    });

    it('should handle reorder with single wallet', async () => {
      await createWallet({ name: 'Only Wallet', currency: 'USD', initial_balance: 100, type: 'cash' });
      
      const wallets = await getWallets();
      expect(wallets).toHaveLength(1);

      // Reorder with single wallet
      await updateWalletsOrder([{ id: wallets[0].id!, display_order: 0 }]);

      const walletsAfter = await getWallets();
      expect(walletsAfter).toHaveLength(1);
      expect(walletsAfter[0].display_order).toBe(0);
    });

    it('should handle rapid repeated reorders', async () => {
      // Create 3 wallets
      await createWallet({ name: 'Wallet A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'Wallet B', currency: 'USD', initial_balance: 200, type: 'bank' });
      await createWallet({ name: 'Wallet C', currency: 'USD', initial_balance: 300, type: 'card' });

      let wallets = await getWallets();

      // Perform 10 rapid reorders
      for (let i = 0; i < 10; i++) {
        const shuffled = [...wallets].sort(() => Math.random() - 0.5);
        await updateWalletsOrder(
          shuffled.map((w, idx) => ({ id: w.id!, display_order: idx }))
        );
        wallets = await getWallets();
      }

      // Verify final state is consistent
      expect(wallets).toHaveLength(3);
      expect(wallets[0].display_order).toBe(0);
      expect(wallets[1].display_order).toBe(1);
      expect(wallets[2].display_order).toBe(2);
    });
  });

  describe('Phase 6: Concurrent Operations', () => {
    
    it('should handle concurrent reorder and wallet creation', async () => {
      await createWallet({ name: 'Wallet A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'Wallet B', currency: 'USD', initial_balance: 200, type: 'bank' });

      const wallets = await getWallets();

      // Execute reorder and create simultaneously
      const reorderPromise = updateWalletsOrder([
        { id: wallets[1].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
      ]);

      const createPromise = createWallet({ 
        name: 'Wallet C', 
        currency: 'USD', 
        initial_balance: 300, 
        type: 'card' 
      });

      await Promise.all([reorderPromise, createPromise]);

      // Verify both operations completed successfully
      const finalWallets = await getWallets();
      expect(finalWallets).toHaveLength(3);
      
      // Verify display_order is sequential (no duplicates or gaps)
      const displayOrders = finalWallets.map(w => w.display_order).sort((a, b) => a - b);
      expect(displayOrders).toEqual([0, 1, 2]);
    });
  });

  describe('Phase 7: Database Integrity Checks', () => {
    
    it('should never have duplicate display_order values', async () => {
      // Create multiple wallets
      for (let i = 1; i <= 10; i++) {
        await createWallet({
          name: `Wallet ${i}`,
          currency: 'USD',
          initial_balance: i * 100,
          type: 'cash'
        });
      }

      // Perform various operations
      let wallets = await getWallets();
      
      // Reorder
      const shuffled = [...wallets].sort(() => Math.random() - 0.5);
      await updateWalletsOrder(
        shuffled.map((w, idx) => ({ id: w.id!, display_order: idx }))
      );

      // Create new
      await createWallet({ name: 'New Wallet', currency: 'USD', initial_balance: 500, type: 'bank' });

      // Delete one
      wallets = await getWallets();
      await deleteWallet(wallets[5].id!);

      // Check for duplicates
      wallets = await getWallets();
      const displayOrders = wallets.map(w => w.display_order);
      const uniqueDisplayOrders = new Set(displayOrders);
      
      expect(displayOrders.length).toBe(uniqueDisplayOrders.size);
    });

    it('should never have null or negative display_order values', async () => {
      for (let i = 1; i <= 5; i++) {
        await createWallet({
          name: `Wallet ${i}`,
          currency: 'USD',
          initial_balance: i * 100,
          type: 'cash'
        });
      }

      const wallets = await getWallets();
      
      for (const wallet of wallets) {
        expect(wallet.display_order).not.toBeNull();
        expect(wallet.display_order).not.toBeUndefined();
        expect(wallet.display_order).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
