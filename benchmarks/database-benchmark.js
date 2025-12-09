#!/usr/bin/env node
/**
 * Benchmark script for PocketFlow database operations
 * Run with: node benchmarks/database-benchmark.js
 * 
 * This script simulates realistic usage patterns and measures performance
 */

const fs = require('fs');
const path = require('path');

// Mock SQLite for Node.js testing (in actual app, this would use real SQLite)
class MockDatabase {
  constructor() {
    this.wallets = [];
    this.transactions = [];
    this.queryCount = 0;
    this.queryTimes = [];
  }

  async getAllAsync(sql, params) {
    const startTime = Date.now();
    this.queryCount++;
    
    // Simulate query execution time (10-50ms)
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
    
    const duration = Date.now() - startTime;
    this.queryTimes.push(duration);
    
    // Mock query results
    if (sql.includes('SELECT * FROM wallets')) {
      return this.wallets;
    } else if (sql.includes('SELECT * FROM transactions')) {
      return this.transactions.slice(0, params[0] || 20);
    }
    
    return [];
  }

  async runAsync(sql, params) {
    const startTime = Date.now();
    this.queryCount++;
    
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15));
    
    const duration = Date.now() - startTime;
    this.queryTimes.push(duration);
    
    if (sql.includes('INSERT INTO wallets')) {
      this.wallets.push({ id: this.wallets.length + 1, ...params });
      return { lastInsertRowId: this.wallets.length };
    } else if (sql.includes('INSERT INTO transactions')) {
      this.transactions.push({ id: this.transactions.length + 1, ...params });
      return { lastInsertRowId: this.transactions.length };
    }
    
    return { changes: 1 };
  }

  async withTransactionAsync(fn) {
    await fn();
  }

  async execAsync(sql) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  async prepareAsync(sql) {
    const self = this;
    return {
      executeAsync: async (params) => {
        await self.runAsync(sql, params);
      },
      finalizeAsync: async () => {},
    };
  }
}

// Benchmark functions
const benchmarks = {
  async createWallets(db, count) {
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      await db.runAsync(
        `INSERT INTO wallets (name, currency, initial_balance, type) VALUES (?, ?, ?, ?)`,
        [`Wallet ${i}`, 'USD', 1000 + i * 100, 'Cash']
      );
    }
    
    const duration = Date.now() - startTime;
    return {
      operation: 'Create Wallets',
      count,
      totalDuration: duration,
      avgDuration: duration / count,
    };
  },

  async createTransactionsBatch(db, walletId, count) {
    const startTime = Date.now();
    
    await db.withTransactionAsync(async () => {
      const stmt = await db.prepareAsync(
        `INSERT INTO transactions (wallet_id, type, amount, category, date) VALUES (?, ?, ?, ?, ?)`
      );
      
      for (let i = 0; i < count; i++) {
        await stmt.executeAsync([
          walletId,
          i % 2 === 0 ? 'expense' : 'income',
          50 + Math.random() * 200,
          'Food',
          new Date().toISOString(),
        ]);
      }
      
      await stmt.finalizeAsync();
    });
    
    const duration = Date.now() - startTime;
    return {
      operation: 'Create Transactions (Batch)',
      count,
      totalDuration: duration,
      avgDuration: duration / count,
    };
  },

  async readWalletsWithBalances(db, count) {
    const startTime = Date.now();
    
    // Simulate getting all wallets
    await db.getAllAsync('SELECT * FROM wallets', []);
    
    // Simulate calculating balances for each wallet
    for (let i = 1; i <= count; i++) {
      await db.getAllAsync(
        `SELECT SUM(amount) as total FROM transactions WHERE wallet_id = ? AND type = 'income'`,
        [i]
      );
      await db.getAllAsync(
        `SELECT SUM(amount) as total FROM transactions WHERE wallet_id = ? AND type = 'expense'`,
        [i]
      );
    }
    
    const duration = Date.now() - startTime;
    return {
      operation: 'Read Wallets with Balances',
      count,
      totalDuration: duration,
      avgDuration: duration / count,
    };
  },

  async readWalletsWithBalancesOptimized(db, count) {
    const startTime = Date.now();
    
    // Single optimized query
    await db.getAllAsync(`
      SELECT 
        w.*,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense
      FROM wallets w
      LEFT JOIN transactions t ON w.id = t.wallet_id
      GROUP BY w.id
    `, []);
    
    const duration = Date.now() - startTime;
    return {
      operation: 'Read Wallets with Balances (Optimized)',
      count,
      totalDuration: duration,
      avgDuration: duration / count,
    };
  },

  async monthlyAnalytics(db) {
    const startTime = Date.now();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // Income
    await db.getAllAsync(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ?`,
      [start, end]
    );
    
    // Expense
    await db.getAllAsync(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?`,
      [start, end]
    );
    
    // Category breakdown
    await db.getAllAsync(
      `SELECT category, SUM(ABS(amount)) as total FROM transactions 
       WHERE type = 'expense' AND date BETWEEN ? AND ? 
       GROUP BY category ORDER BY total DESC`,
      [start, end]
    );
    
    const duration = Date.now() - startTime;
    return {
      operation: 'Monthly Analytics',
      count: 1,
      totalDuration: duration,
      avgDuration: duration,
    };
  },

  async sevenDayChartData(db) {
    const startTime = Date.now();
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    
    // Inefficient: One query per day
    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo);
      day.setDate(day.getDate() + i);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59).toISOString();
      
      await db.getAllAsync(
        `SELECT SUM(ABS(amount)) as total FROM transactions 
         WHERE type = 'expense' AND date BETWEEN ? AND ?`,
        [dayStart, dayEnd]
      );
    }
    
    const duration = Date.now() - startTime;
    return {
      operation: '7-Day Chart Data (Naive)',
      count: 7,
      totalDuration: duration,
      avgDuration: duration / 7,
    };
  },

  async sevenDayChartDataOptimized(db) {
    const startTime = Date.now();
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    
    // Optimized: Single GROUP BY query
    await db.getAllAsync(
      `SELECT DATE(date) as date, SUM(ABS(amount)) as total
       FROM transactions 
       WHERE type = 'expense' AND date >= ?
       GROUP BY DATE(date)
       ORDER BY date ASC`,
      [sevenDaysAgo.toISOString()]
    );
    
    const duration = Date.now() - startTime;
    return {
      operation: '7-Day Chart Data (Optimized)',
      count: 1,
      totalDuration: duration,
      avgDuration: duration,
    };
  },
};

// Run benchmarks
async function runBenchmarks() {
  console.log('='.repeat(70));
  console.log('PocketFlow Database Performance Benchmark');
  console.log('='.repeat(70));
  console.log();
  
  const db = new MockDatabase();
  const results = [];
  
  // Setup: Create test data
  console.log('📊 Setting up test data...');
  await benchmarks.createWallets(db, 10);
  await benchmarks.createTransactionsBatch(db, 1, 100);
  console.log('✅ Test data created: 10 wallets, 100 transactions');
  console.log();
  
  // Reset metrics
  db.queryCount = 0;
  db.queryTimes = [];
  
  // Run benchmarks
  console.log('🔬 Running benchmarks...');
  console.log();
  
  // Wallet operations
  console.log('--- Wallet Operations ---');
  results.push(await benchmarks.readWalletsWithBalances(db, 10));
  console.log(`  Naive approach: ${results[results.length - 1].totalDuration.toFixed(2)}ms`);
  
  results.push(await benchmarks.readWalletsWithBalancesOptimized(db, 10));
  console.log(`  Optimized approach: ${results[results.length - 1].totalDuration.toFixed(2)}ms`);
  console.log();
  
  // Analytics operations
  console.log('--- Analytics Operations ---');
  results.push(await benchmarks.monthlyAnalytics(db));
  console.log(`  Monthly analytics: ${results[results.length - 1].totalDuration.toFixed(2)}ms`);
  console.log();
  
  // Chart data
  console.log('--- Chart Data Generation ---');
  results.push(await benchmarks.sevenDayChartData(db));
  console.log(`  7-day chart (naive): ${results[results.length - 1].totalDuration.toFixed(2)}ms`);
  
  results.push(await benchmarks.sevenDayChartDataOptimized(db));
  console.log(`  7-day chart (optimized): ${results[results.length - 1].totalDuration.toFixed(2)}ms`);
  console.log();
  
  // Batch operations
  console.log('--- Batch Operations ---');
  results.push(await benchmarks.createTransactionsBatch(db, 1, 50));
  console.log(`  Create 50 transactions (batch): ${results[results.length - 1].totalDuration.toFixed(2)}ms`);
  console.log();
  
  // Summary
  console.log('='.repeat(70));
  console.log('📈 Summary');
  console.log('='.repeat(70));
  console.log();
  
  const sortedTimes = [...db.queryTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  const avg = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length || 0;
  
  console.log(`Total Queries Executed: ${db.queryCount}`);
  console.log(`Query Latency (avg): ${avg.toFixed(2)}ms`);
  console.log(`Query Latency (p50): ${p50.toFixed(2)}ms`);
  console.log(`Query Latency (p95): ${p95.toFixed(2)}ms`);
  console.log(`Query Latency (p99): ${p99.toFixed(2)}ms`);
  console.log();
  
  // Performance comparison
  console.log('⚡ Performance Improvements:');
  const naiveBalance = results.find(r => r.operation === 'Read Wallets with Balances');
  const optimizedBalance = results.find(r => r.operation === 'Read Wallets with Balances (Optimized)');
  if (naiveBalance && optimizedBalance) {
    const improvement = ((naiveBalance.totalDuration - optimizedBalance.totalDuration) / naiveBalance.totalDuration * 100);
    console.log(`  Wallet balances: ${improvement.toFixed(1)}% faster (${naiveBalance.totalDuration.toFixed(0)}ms → ${optimizedBalance.totalDuration.toFixed(0)}ms)`);
  }
  
  const naiveChart = results.find(r => r.operation === '7-Day Chart Data (Naive)');
  const optimizedChart = results.find(r => r.operation === '7-Day Chart Data (Optimized)');
  if (naiveChart && optimizedChart) {
    const improvement = ((naiveChart.totalDuration - optimizedChart.totalDuration) / naiveChart.totalDuration * 100);
    console.log(`  7-day chart: ${improvement.toFixed(1)}% faster (${naiveChart.totalDuration.toFixed(0)}ms → ${optimizedChart.totalDuration.toFixed(0)}ms)`);
  }
  console.log();
  
  // Write results to file
  const reportPath = path.join(__dirname, 'benchmark-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    database: 'SQLite (Mock)',
    results,
    queryMetrics: {
      totalQueries: db.queryCount,
      avgLatency: avg,
      p50: p50,
      p95: p95,
      p99: p99,
    },
  }, null, 2));
  
  console.log(`📄 Full results written to: ${reportPath}`);
  console.log();
  console.log('✅ Benchmark complete!');
}

// Run if called directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks, benchmarks };
