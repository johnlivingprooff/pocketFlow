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

import { getDb, exec } from './index';
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
export function checkDatabaseIntegrity(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const database = getDb();

  try {
    log('[Integrity Check] Starting database integrity check...');

    const nullOrderWallets = database.getAll<{ id: number }>(
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

    const negativeOrderWallets = database.getAll<{ id: number; display_order: number }>(
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

    const duplicateOrders = database.getAll<{ 
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

    const walletCount = database.getAll<{ count: number }>(
      'SELECT COUNT(*) as count FROM wallets;'
    );
    const totalWallets = walletCount[0]?.count || 0;

    if (totalWallets > 0) {
      const allOrders = database.getAll<{ display_order: number }>(
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
export function repairDatabaseIntegrity(dryRun: boolean = true): RepairResult {
  const result: RepairResult = {
    success: false,
    issuesFound: 0,
    issuesFixed: 0,
    backupCreated: false,
    errors: []
  };

  const database = getDb();

  try {
    log(`[Integrity Repair] Starting integrity repair (dryRun: ${dryRun})...`);

    const issues = checkDatabaseIntegrity();
    result.issuesFound = issues.length;

    if (issues.length === 0) {
      log('[Integrity Repair] No issues to repair');
      result.success = true;
      return result;
    }

    if (dryRun) {
      log('[Integrity Repair] DRY RUN MODE - No changes will be made');
      
      const preview = database.getAll<{
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

    log('[Integrity Repair] Creating backup table...');
    const backupTableName = `wallets_backup_integrity_repair_${Date.now()}`;
    
    try {
      database.transaction(tx => {
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

      const verificationIssues = checkDatabaseIntegrity();
      
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
      
      if (result.backupCreated) {
        try {
          log('[Integrity Repair] Attempting to restore from backup...');
          database.transaction(tx => {
            tx.execute(`DELETE FROM wallets;`);
            tx.execute(`INSERT INTO wallets SELECT * FROM ${backupTableName};`);
          });
          log('[Integrity Repair] ✓ Restored from backup');
        } catch (rollbackErr: any) {
          logError('[Integrity Repair] Failed to restore from backup:', rollbackErr);
          result.errors.push(`Rollback failed: ${rollbackErr.message}`);
        }
      }
    }
    
    return result;
  } catch (err: any) {
    logError('[Integrity Repair] Top-level failure in repairDatabaseIntegrity:', err);
    result.errors.push(err.message);
    return result;
  }
}


/**
 * Get database integrity health score (0-100)
 * @returns Health score where 100 = perfect, 0 = critical issues
 */
export function getDatabaseHealthScore(): number {
  try {
    const issues = checkDatabaseIntegrity();
    
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
export function cleanupBackupTables(): void {
  try {
    exec('DROP TABLE IF EXISTS wallets_backup_integrity_repair;');
    log('[Integrity Repair] Backup tables cleaned up');
  } catch (err: any) {
    logError('[Integrity Repair] Failed to cleanup backup tables:', err);
    throw err;
  }
}
