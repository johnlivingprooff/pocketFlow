/**
 * Release-Build Specific Tests for Wallet Reorder
 * 
 * These tests are designed to catch issues that only appear in release builds,
 * particularly focusing on Hermes engine differences and number type handling.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDb, ensureTables, clearDatabase } from '../../src/lib/db/index';
import { 
  createWallet, 
  getWallets, 
  updateWalletsOrder,
} from '../../src/lib/db/wallets';
import { Wallet } from '../../src/types/wallet';
import { detectJSEngine, isSafeInteger } from '../../src/utils/platform';

describe('Wallet Reorder - Release Build Tests', () => {
  
  beforeEach(async () => {
    await ensureTables();
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('JS Engine Detection', () => {
    it('should detect the current JS engine', () => {
      const engine = detectJSEngine();
      console.log('[TEST] Running in JS engine:', engine);
      
      // Should be one of the known engines
      expect(['hermes', 'jsc', 'v8', 'unknown']).toContain(engine);
    });
  });

  describe('Number Type Handling (Hermes vs JSC)', () => {
    it('should handle display_order as safe integer', async () => {
      // Create a wallet
      await createWallet({
        name: 'Test Wallet',
        currency: 'USD',
        initial_balance: 100,
        type: 'cash',
      });
      
      const wallets = await getWallets();
      expect(wallets).toHaveLength(1);
      
      const wallet = wallets[0];
      
      // Verify display_order is a safe integer
      expect(wallet.display_order).toBeDefined();
      expect(typeof wallet.display_order).toBe('number');
      expect(Number.isInteger(wallet.display_order)).toBe(true);
      expect(isSafeInteger(wallet.display_order)).toBe(true);
    });

    it('should allow wallet creation after reorder (critical for release builds)', async () => {
      // Create and reorder
      await createWallet({ name: 'A', currency: 'USD', initial_balance: 100, type: 'cash' });
      await createWallet({ name: 'B', currency: 'USD', initial_balance: 200, type: 'bank' });
      
      let wallets = await getWallets();
      await updateWalletsOrder([
        { id: wallets[1].id!, display_order: 0 },
        { id: wallets[0].id!, display_order: 1 },
      ]);
      
      // CRITICAL TEST: Create a new wallet after reorder
      // This is where release builds were failing
      await createWallet({ name: 'C', currency: 'USD', initial_balance: 300, type: 'card' });
      
      wallets = await getWallets();
      expect(wallets).toHaveLength(3);
      expect(wallets[0].name).toBe('B');
      expect(wallets[1].name).toBe('A');
      expect(wallets[2].name).toBe('C');
      
      // Verify display_order integrity
      expect(wallets[2].display_order).toBe(2);
      expect(Number.isInteger(wallets[2].display_order)).toBe(true);
    });
  });
});
