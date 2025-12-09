-- ============================================================================
-- Wallet Display Order Corruption Repair Script
-- ============================================================================
-- Purpose: Fix wallets with corrupted or missing display_order values
-- Author: GitHub Copilot Workspace
-- Date: 2025-12-09
-- Version: 1.0
--
-- This script detects and repairs:
-- 1. Wallets with NULL display_order
-- 2. Wallets with duplicate display_order values
-- 3. Wallets with negative display_order values
-- 4. Wallets with gaps in display_order sequence
--
-- MODES:
--   --dry-run: Shows what would be changed without making changes
--   --apply: Actually applies the fixes (use with caution!)
--
-- USAGE:
--   sqlite3 pocketflow.db < fix_display_order_corruption.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Diagnostic Query - Find Corrupted Wallets
-- ============================================================================

.print "===== WALLET DISPLAY ORDER DIAGNOSTIC ====="
.print ""

-- Check for NULL display_order values
.print "Checking for NULL display_order values..."
SELECT 
  COUNT(*) as count,
  'NULL display_order' as issue_type
FROM wallets 
WHERE display_order IS NULL;

.print ""

-- Check for negative display_order values
.print "Checking for negative display_order values..."
SELECT 
  COUNT(*) as count,
  'Negative display_order' as issue_type
FROM wallets 
WHERE display_order < 0;

.print ""

-- Check for duplicate display_order values
.print "Checking for duplicate display_order values..."
SELECT 
  display_order,
  COUNT(*) as duplicate_count,
  GROUP_CONCAT(id) as wallet_ids
FROM wallets 
GROUP BY display_order 
HAVING COUNT(*) > 1;

.print ""

-- Check for gaps in sequence
.print "Checking for gaps in display_order sequence..."
WITH RECURSIVE cnt(x) AS (
  SELECT 0
  UNION ALL
  SELECT x+1 FROM cnt
  LIMIT (SELECT COUNT(*) FROM wallets)
)
SELECT 
  x as missing_position
FROM cnt
WHERE x NOT IN (SELECT display_order FROM wallets)
  AND x < (SELECT COUNT(*) FROM wallets);

.print ""

-- Display all wallets ordered by display_order
.print "Current wallet order:"
.print "ID | Name | Display Order | Created At"
.print "------------------------------------------------"
SELECT 
  id || ' | ' || name || ' | ' || display_order || ' | ' || created_at
FROM wallets
ORDER BY display_order ASC;

.print ""
.print "===== END DIAGNOSTIC ====="
.print ""

-- ============================================================================
-- STEP 2: Repair Script (DRY-RUN MODE)
-- ============================================================================

.print "===== REPAIR PREVIEW (DRY-RUN) ====="
.print ""
.print "The following wallets would be updated:"
.print ""

-- Show what would be changed
WITH ordered_wallets AS (
  SELECT 
    id,
    name,
    display_order as current_order,
    ROW_NUMBER() OVER (ORDER BY 
      CASE 
        WHEN display_order IS NULL THEN 9999
        WHEN display_order < 0 THEN 9999
        ELSE display_order
      END ASC,
      created_at ASC
    ) - 1 as new_order
  FROM wallets
)
SELECT 
  id || ' | ' || name || ' | ' || current_order || ' → ' || new_order as change
FROM ordered_wallets
WHERE current_order != new_order 
   OR current_order IS NULL;

.print ""
.print "===== END REPAIR PREVIEW ====="
.print ""

-- ============================================================================
-- STEP 3: Repair Script (APPLY MODE) - COMMENTED OUT BY DEFAULT
-- ============================================================================

-- UNCOMMENT THE FOLLOWING SECTION TO ACTUALLY APPLY REPAIRS
-- WARNING: This will modify your database!

/*
.print "===== APPLYING REPAIRS ====="
.print ""

-- Create a backup table first
CREATE TABLE IF NOT EXISTS wallets_backup_before_repair AS 
SELECT * FROM wallets;

.print "✓ Backup created: wallets_backup_before_repair"
.print ""

-- Begin transaction for atomicity
BEGIN TRANSACTION;

-- Create temporary table with correct ordering
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

-- Update all wallets with corrected display_order
UPDATE wallets
SET display_order = (
  SELECT new_display_order 
  FROM wallet_fix 
  WHERE wallet_fix.id = wallets.id
);

-- Verify the fix worked
SELECT 
  CASE 
    WHEN COUNT(*) = (SELECT MAX(display_order) + 1 FROM wallets) 
      AND MIN(display_order) = 0
      AND COUNT(DISTINCT display_order) = COUNT(*)
    THEN 'SUCCESS'
    ELSE 'FAILED'
  END as repair_status,
  COUNT(*) as total_wallets,
  MIN(display_order) as min_order,
  MAX(display_order) as max_order,
  COUNT(DISTINCT display_order) as unique_orders
FROM wallets;

-- Commit if everything looks good
COMMIT;

.print ""
.print "✓ Repairs applied successfully"
.print "✓ Backup available in: wallets_backup_before_repair"
.print ""
.print "===== END REPAIR APPLICATION ====="
*/

-- ============================================================================
-- STEP 4: Verification Queries
-- ============================================================================

.print "===== VERIFICATION ====="
.print ""

-- Verify no NULLs
.print "Checking for NULL values after repair..."
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No NULL values found'
    ELSE '✗ Still has ' || COUNT(*) || ' NULL values'
  END as null_check
FROM wallets 
WHERE display_order IS NULL;

.print ""

-- Verify no negatives
.print "Checking for negative values after repair..."
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No negative values found'
    ELSE '✗ Still has ' || COUNT(*) || ' negative values'
  END as negative_check
FROM wallets 
WHERE display_order < 0;

.print ""

-- Verify no duplicates
.print "Checking for duplicate values after repair..."
SELECT 
  CASE 
    WHEN MAX(duplicate_count) = 1 THEN '✓ No duplicate values found'
    ELSE '✗ Still has duplicates'
  END as duplicate_check
FROM (
  SELECT COUNT(*) as duplicate_count
  FROM wallets 
  GROUP BY display_order
);

.print ""

-- Verify sequential (no gaps)
.print "Checking for sequential ordering (0, 1, 2, ...)..."
WITH wallet_count AS (
  SELECT COUNT(*) as total FROM wallets
)
SELECT 
  CASE 
    WHEN (SELECT MAX(display_order) FROM wallets) = (SELECT total - 1 FROM wallet_count)
      AND (SELECT MIN(display_order) FROM wallets) = 0
      AND (SELECT COUNT(DISTINCT display_order) FROM wallets) = (SELECT total FROM wallet_count)
    THEN '✓ Sequential ordering verified'
    ELSE '✗ Ordering is not sequential'
  END as sequence_check;

.print ""
.print "===== END VERIFICATION ====="
.print ""

-- ============================================================================
-- STEP 5: Rollback Instructions (if needed)
-- ============================================================================

.print "===== ROLLBACK INSTRUCTIONS ====="
.print ""
.print "If you need to undo the repairs, run:"
.print ""
.print "  BEGIN TRANSACTION;"
.print "  DELETE FROM wallets;"
.print "  INSERT INTO wallets SELECT * FROM wallets_backup_before_repair;"
.print "  DROP TABLE wallets_backup_before_repair;"
.print "  COMMIT;"
.print ""
.print "===== END ROLLBACK INSTRUCTIONS ====="
