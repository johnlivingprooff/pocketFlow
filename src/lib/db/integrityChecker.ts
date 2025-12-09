/**
 * Database Integrity Checker and Repair Tool
 * 
 * This module provides functions to detect and repair database corruption,
 * specifically for wallet display_order issues.
 * 
 * Usage:
 *   import { checkDatabaseIntegrity, repairDatabaseIntegrity } from './repair-scripts/integrityChecker';
 *   
 *   const issues = await checkDatabaseIntegrity();
 *   if (issues.length > 0) {
 *     await repairDatabaseIntegrity(dryRun: false);
 *   }
 */

import { getDb } from './index';
import { log, error as logError } from '../../utils/logger';

export interface IntegrityIssue {
  issueType: 'null_display_order' | 'negative_display_order' | 'duplicate_display_order' | 'gap_in_sequence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedWallets?: number[];
  recommendation: string;
}

export interface RepairResult {
  success: boolean;
  issuesFound: number;
  issuesFixed: number;
  backupCreated: boolean;
  errors: string[];
}

/**
 * Check database integrity and detect wallet display_order issues
 * @returns Array of integrity issues found
 */
export async function checkDatabaseIntegrity(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];
  const database = await getDb();

  try {
    log('[Integrity Check] Starting database integrity check...');

    // Check 1: NULL display_order values
    const nullOrderWallets = await database.getAllAsync<{ id: number }>(
      'SELECT id FROM wallets WHERE display_order IS NULL;'
    );
    
    if (nullOrderWallets.length > 0) {
      issues.push({
        issueType: 'null_display_order',
        severity: 'critical',
        description: `Found ${nullOrderWallets.length} wallet(s) with NULL display_order`,
        affectedWallets: nullOrderWallets.map(w => w.id),
        recommendation: 'Run repair script to assign sequential display_order values'
      });
    }

    // Check 2: Negative display_order values
    const negativeOrderWallets = await database.getAllAsync<{ id: number; display_order: number }>(
      'SELECT id, display_order FROM wallets WHERE display_order < 0;'
    );
    
    if (negativeOrderWallets.length > 0) {
      issues.push({
        issueType: 'negative_display_order',
        severity: 'high',
        description: `Found ${negativeOrderWallets.length} wallet(s) with negative display_order`,
        affectedWallets: negativeOrderWallets.map(w => w.id),
        recommendation: 'Run repair script to assign sequential display_order values'
      });
    }

    // Check 3: Duplicate display_order values
    const duplicateOrders = await database.getAllAsync<{ 
      display_order: number; 
      duplicate_count: number; 
      wallet_ids: string 
    }>(
      `SELECT display_order, COUNT(*) as duplicate_count, GROUP_CONCAT(id) as wallet_ids
       FROM wallets 
       GROUP BY display_order 
       HAVING COUNT(*) > 1;`
    );
    
    if (duplicateOrders.length > 0) {
      const totalAffected = duplicateOrders.reduce((sum, d) => sum + d.duplicate_count, 0);
      issues.push({
        issueType: 'duplicate_display_order',
        severity: 'critical',
        description: `Found ${duplicateOrders.length} display_order value(s) used by multiple wallets (${totalAffected} wallets affected)`,
        affectedWallets: duplicateOrders.flatMap(d => d.wallet_ids.split(',').map(id => parseInt(id))),
        recommendation: 'Run repair script to assign unique sequential display_order values'
      });
    }

    // Check 4: Gaps in sequence
    const walletCount = await database.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM wallets;'
    );
    const totalWallets = walletCount[0]?.count || 0;

    if (totalWallets > 0) {
      const allOrders = await database.getAllAsync<{ display_order: number }>(
        'SELECT DISTINCT display_order FROM wallets WHERE display_order IS NOT NULL ORDER BY display_order ASC;'
      );
      
      const expectedOrders = Array.from({ length: totalWallets }, (_, i) => i);
      const actualOrders = allOrders.map(o => o.display_order);
      
      const missingOrders = expectedOrders.filter(expected => !actualOrders.includes(expected));
      
      if (missingOrders.length > 0) {
        issues.push({
          issueType: 'gap_in_sequence',
          severity: 'medium',
          description: `Found ${missingOrders.length} gap(s) in display_order sequence (missing: ${missingOrders.join(', ')})`,
          recommendation: 'Run repair script to create sequential display_order values without gaps'
        });
      }
    }

    if (issues.length === 0) {
      log('[Integrity Check] ✓ No integrity issues found');
    } else {
      log(`[Integrity Check] Found ${issues.length} integrity issue(s)`);
      issues.forEach(issue => {
        logError(`[Integrity Check] ${issue.severity.toUpperCase()}: ${issue.description}`);
      });
    }

    return issues;
  } catch (err: any) {
    logError('[Integrity Check] Failed to check database integrity:', err);
    throw new Error(`Integrity check failed: ${err.message}`);
  }
}

/**
 * Repair database integrity issues
 * @param dryRun If true, only simulates repairs without actually modifying data
 * @returns Repair result with success status and details
 */
export async function repairDatabaseIntegrity(dryRun: boolean = true): Promise<RepairResult> {
  const result: RepairResult = {
    success: false,
    issuesFound: 0,
    issuesFixed: 0,
    backupCreated: false,
    errors: []
  };

  const database = await getDb();

  try {
    log(`[Integrity Repair] Starting integrity repair (dryRun: ${dryRun})...`);

    // First, check what issues exist
    const issues = await checkDatabaseIntegrity();
    result.issuesFound = issues.length;

    if (issues.length === 0) {
      log('[Integrity Repair] No issues to repair');
      result.success = true;
      return result;
    }

    if (dryRun) {
      log('[Integrity Repair] DRY RUN MODE - No changes will be made');
      
      // Show what would be changed
      const preview = await database.getAllAsync<{
        id: number;
        name: string;
        current_order: number | null;
        new_order: number;
      }>(
        `SELECT 
          w.id,
          w.name,
          w.display_order as current_order,
          ROW_NUMBER() OVER (ORDER BY 
            CASE 
              WHEN w.display_order IS NULL THEN 9999
              WHEN w.display_order < 0 THEN 9999
              ELSE w.display_order
            END ASC,
            w.created_at ASC
          ) - 1 as new_order
        FROM wallets w
        WHERE w.display_order IS NULL 
           OR w.display_order < 0 
           OR w.display_order IN (
             SELECT display_order 
             FROM wallets 
             GROUP BY display_order 
             HAVING COUNT(*) > 1
           );`
      );

      log('[Integrity Repair] Preview of changes:');
      preview.forEach(w => {
        log(`  Wallet ${w.id} (${w.name}): display_order ${w.current_order} → ${w.new_order}`);
      });

      result.issuesFixed = preview.length;
      result.success = true;
      return result;
    }

    // ACTUAL REPAIR - Create backup and fix issues
    log('[Integrity Repair] Creating backup table...');
    
    const backupTableName = `wallets_backup_integrity_repair_${Date.now()}`;
    await database.execAsync(`
      DROP TABLE IF EXISTS ${backupTableName};
      CREATE TABLE ${backupTableName} AS SELECT * FROM wallets;
    `);
    
    result.backupCreated = true;
    log(`[Integrity Repair] ✓ Backup created: ${backupTableName}`);

    // Perform repair in a transaction
    await database.withTransactionAsync(async () => {
      log('[Integrity Repair] Applying repairs...');

      // Create temporary table with correct ordering
      await database.execAsync(`
        CREATE TEMPORARY TABLE wallet_fix AS
        SELECT 
          id,
          ROW_NUMBER() OVER (ORDER BY 
            CASE 
              WHEN display_order IS NULL THEN 9999
              WHEN display_order < 0 THEN 9999
              ELSE display_order
            END ASC,
            created_at ASC
          ) - 1 as new_display_order
        FROM wallets;
      `);

      // Update all wallets with corrected display_order
      const updateResult = await database.runAsync(`
        UPDATE wallets
        SET display_order = (
          SELECT new_display_order 
          FROM wallet_fix 
          WHERE wallet_fix.id = wallets.id
        );
      `);

      result.issuesFixed = updateResult.changes;

      // Clean up temporary table
      await database.execAsync('DROP TABLE wallet_fix;');

      log(`[Integrity Repair] ✓ Updated ${result.issuesFixed} wallet(s)`);
    });

    // Verify the repair worked
    const verificationIssues = await checkDatabaseIntegrity();
    
    if (verificationIssues.length === 0) {
      log('[Integrity Repair] ✓ Verification passed - all issues resolved');
      result.success = true;
    } else {
      logError('[Integrity Repair] ✗ Verification failed - some issues remain');
      result.success = false;
      result.errors.push(`${verificationIssues.length} issue(s) remain after repair`);
    }

    return result;
  } catch (err: any) {
    logError('[Integrity Repair] Failed to repair database integrity:', err);
    result.errors.push(err.message);
    
    // Attempt rollback if backup was created
    if (result.backupCreated) {
      try {
        log('[Integrity Repair] Attempting to restore from backup...');
        await database.withTransactionAsync(async () => {
          await database.execAsync(`
            DELETE FROM wallets;
            INSERT INTO wallets SELECT * FROM wallets_backup_integrity_repair;
          `);
        });
        log('[Integrity Repair] ✓ Restored from backup');
      } catch (rollbackErr: any) {
        logError('[Integrity Repair] Failed to restore from backup:', rollbackErr);
        result.errors.push(`Rollback failed: ${rollbackErr.message}`);
      }
    }
    
    return result;
  }
}

/**
 * Get database integrity health score (0-100)
 * @returns Health score where 100 = perfect, 0 = critical issues
 */
export async function getDatabaseHealthScore(): Promise<number> {
  try {
    const issues = await checkDatabaseIntegrity();
    
    if (issues.length === 0) return 100;
    
    // Deduct points based on severity
    let deduction = 0;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          deduction += 30;
          break;
        case 'high':
          deduction += 20;
          break;
        case 'medium':
          deduction += 10;
          break;
        case 'low':
          deduction += 5;
          break;
      }
    });
    
    return Math.max(0, 100 - deduction);
  } catch (err) {
    logError('[Health Score] Failed to calculate health score:', err);
    return 0;
  }
}

/**
 * Clean up backup tables created during repair
 */
export async function cleanupBackupTables(): Promise<void> {
  const database = await getDb();
  
  try {
    await database.execAsync('DROP TABLE IF EXISTS wallets_backup_integrity_repair;');
    log('[Integrity Repair] Backup tables cleaned up');
  } catch (err: any) {
    logError('[Integrity Repair] Failed to cleanup backup tables:', err);
    throw err;
  }
}
