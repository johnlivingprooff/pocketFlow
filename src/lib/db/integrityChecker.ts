/**
 * Database Integrity Checker and Repair Tool
 * 
 * This module provides functions to detect and repair database corruption,
 * specifically for wallet display_order issues.
 * 
 * Usage:
 *   import { checkDatabaseIntegrity, repairDatabaseIntegrity } from './repair-scripts/integrityChecker';
 *   
 *   const issues = checkDatabaseIntegrity();
 *   if (issues.length > 0) {
 *     repairDatabaseIntegrity(dryRun: false);
 *   }
 */

import { getDbAsync } from './index';
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
  const database = await getDbAsync();

  try {
    log('[Integrity Check] Starting database integrity check...');

    // Check 1: NULL display_order values
    const nullOrderWalletsResult = database.execute(
      'SELECT id FROM wallets WHERE display_order IS NULL;'
    );
    const nullOrderWallets = nullOrderWalletsResult.rows?._array || [];
    
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
    const negativeOrderWalletsResult = database.execute(
      'SELECT id, display_order FROM wallets WHERE display_order < 0;'
    );
    const negativeOrderWallets = negativeOrderWalletsResult.rows?._array || [];
    
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
    const duplicateOrdersResult = database.execute(
      `SELECT display_order, COUNT(*) as duplicate_count, GROUP_CONCAT(id) as wallet_ids
       FROM wallets 
       GROUP BY display_order 
       HAVING COUNT(*) > 1;`
    );
    const duplicateOrders = duplicateOrdersResult.rows?._array || [];
    
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
    const walletCountResult = database.execute(
      'SELECT COUNT(*) as count FROM wallets;'
    );
    const totalWallets = walletCountResult.rows?._array[0]?.count || 0;

    if (totalWallets > 0) {
      const allOrdersResult = database.execute(
        'SELECT DISTINCT display_order FROM wallets WHERE display_order IS NOT NULL ORDER BY display_order ASC;'
      );
      const allOrders = allOrdersResult.rows?._array || [];
      
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

  const database = await getDbAsync();

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
      
      const previewResult = database.execute(
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
      const preview = previewResult.rows?._array || [];

      log('[Integrity Repair] Preview of changes:');
      preview.forEach(w => {
        log(`  Wallet ${w.id} (${w.name}): display_order ${w.current_order} → ${w.new_order}`);
      });

      result.issuesFixed = preview.length;
      result.success = true;
      return result;
    }

    log('[Integrity Repair] Creating backup table...');
    
    try {
      database.transaction(tx => {
        const backupTableName = `wallets_backup_integrity_repair_${Date.now()}`;
        tx.execute(`DROP TABLE IF EXISTS ${backupTableName};`);
        tx.execute(`CREATE TABLE ${backupTableName} AS SELECT * FROM wallets;`);
        result.backupCreated = true;
        log(`[Integrity Repair] ✓ Backup created: ${backupTableName}`);

        log('[Integrity Repair] Applying repairs...');

        tx.execute(`
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

        const updateResult = tx.execute(`
          UPDATE wallets
          SET display_order = (
            SELECT new_display_order 
            FROM wallet_fix 
            WHERE wallet_fix.id = wallets.id
          );
        `);
        result.issuesFixed = updateResult.rowsAffected;

        tx.execute('DROP TABLE wallet_fix;');
        log(`[Integrity Repair] ✓ Updated ${result.issuesFixed} wallet(s)`);
      });

      const verificationIssues = await checkDatabaseIntegrity();
      if (verificationIssues.length === 0) {
        log('[Integrity Repair] ✓ Verification passed - all issues resolved');
        result.success = true;
      } else {
        logError('[Integrity Repair] ✗ Verification failed - some issues remain');
        result.success = false;
        result.errors.push(`${verificationIssues.length} issue(s) remain after repair`);
      }
    } catch (err: any) {
      logError('[Integrity Repair] Failed to repair database integrity:', err);
      result.errors.push(err.message);
      // Rollback is automatic with transaction failure
    }
    
    return result;
  } catch (err: any) {
    logError('[Integrity Repair] Failed to repair database integrity:', err);
    result.errors.push(err.message);
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
  const database = await getDbAsync();
  
  try {
    database.execute('DROP TABLE IF EXISTS wallets_backup_integrity_repair;');
    log('[Integrity Repair] Backup tables cleaned up');
  } catch (err: any) {
    logError('[Integrity Repair] Failed to cleanup backup tables:', err);
    throw err;
  }
}
