# Wallet Reorder Fix - Deployment Runbook

**Version:** 1.0  
**Date:** 2025-12-09  
**Maintainer:** Development Team

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Monitoring and Alerts](#monitoring-and-alerts)
6. [Troubleshooting](#troubleshooting)
7. [Communication Plan](#communication-plan)

---

## Pre-Deployment Checklist

### Environment Preparation

- [ ] **Backup Current Database**
  ```bash
  # For testing environment
  adb pull /data/data/com.pocketflow/databases/pocketflow.db ./backups/pocketflow_backup_$(date +%Y%m%d_%H%M%S).db
  ```

- [ ] **Verify Test Coverage**
  ```bash
  npm test -- tests/wallet-reorder.test.ts
  # Ensure all tests pass
  ```

- [ ] **Run Database Integrity Check**
  ```typescript
  import { checkDatabaseIntegrity } from './src/lib/db/integrityChecker';
  const issues = await checkDatabaseIntegrity();
  console.log('Issues found:', issues.length);
  ```

- [ ] **Document Current State**
  - Number of users affected (if known)
  - Number of wallets with display_order issues
  - Current error rates (if monitoring exists)

### Code Review

- [ ] **Verify All Changes Are Committed**
  ```bash
  git status
  # Should show clean working tree
  ```

- [ ] **Review Changes**
  - [ ] `src/lib/db/wallets.ts` - createWallet, getWallets, updateWalletsOrder
  - [ ] `src/lib/db/index.ts` - ensureTables migration
  - [ ] `src/components/DraggableWalletList.tsx` - UI reorder logic
  - [ ] `src/lib/db/integrityChecker.ts` - Repair tools

- [ ] **TypeScript Compilation Check**
  ```bash
  npx tsc --noEmit
  # Should have no errors
  ```

### Stakeholder Approval

- [ ] Product Owner approval
- [ ] Technical Lead review
- [ ] QA sign-off
- [ ] Release notes prepared

---

## Deployment Steps

### Step 1: Staging Deployment (if applicable)

```bash
# Build staging version
npm run build:staging

# Deploy to staging
# (specific commands depend on your deployment infrastructure)
```

**Verification Points:**
- [ ] Staging app launches successfully
- [ ] Database migration runs without errors
- [ ] Existing wallets display in correct order
- [ ] New wallet creation assigns sequential display_order
- [ ] Wallet reordering works smoothly
- [ ] No errors in console logs

### Step 2: Canary Deployment (5-10% of users)

```bash
# Build production version
npm run build:production

# Deploy to canary environment
# Release to 5% of users first
```

**Monitoring During Canary:**

Watch these metrics for 30-60 minutes:
- App crash rate (should not increase)
- Wallet operation success rate (should be 99%+)
- Database query latency (should remain stable)
- User-reported issues (should not increase)

**Success Criteria for Canary:**
- Crash rate < 0.1%
- No increase in error reports
- All wallet operations working
- No database corruption detected

**If Canary Fails:** Proceed to Rollback Procedures

### Step 3: Full Production Deployment

```bash
# If canary successful, proceed with full rollout
# Gradually increase to 25%, 50%, 75%, 100%
```

**Monitoring During Rollout:**
- Continue monitoring same metrics as canary
- Watch for any sudden spikes in errors
- Monitor user feedback channels

### Step 4: Database Migration Execution

The migration runs automatically when app starts (`ensureTables()`):

```typescript
// This runs automatically in app/_layout.tsx
// Migration code in src/lib/db/index.ts lines 80-102

// What it does:
// 1. Detects wallets with display_order = 0
// 2. Assigns sequential values based on created_at
// 3. Logs success/failure
```

**Expected Behavior:**
- First app launch after update: Migration runs
- Subsequent launches: Migration skips (idempotent)
- Log message: `[DB] Migration: Fixed display_order for N existing wallets`

---

## Post-Deployment Verification

### Immediate Checks (Within 15 minutes)

- [ ] **Check App Launch Success Rate**
  ```
  Target: > 99% successful launches
  ```

- [ ] **Verify Migration Logs**
  ```
  Look for: [DB] Migration: Fixed display_order for X existing wallets
  Should appear once per device on first launch
  ```

- [ ] **Manual Testing Checklist**
  - [ ] Create new wallet → verify display_order assigned
  - [ ] Reorder 3+ wallets → verify order persists
  - [ ] Close and reopen app → verify order maintained
  - [ ] Create transaction after reorder → verify success
  - [ ] Create new wallet after reorder → verify correct position

### Extended Monitoring (24-48 hours)

- [ ] **Database Health Check**
  ```typescript
  import { getDatabaseHealthScore } from './src/lib/db/integrityChecker';
  const score = await getDatabaseHealthScore();
  // Score should be 100 for healthy database
  ```

- [ ] **Error Rate Monitoring**
  - Wallet creation errors: Should be < 0.1%
  - Wallet reorder errors: Should be < 0.1%
  - Transaction creation errors: Should remain stable

- [ ] **User Feedback Monitoring**
  - Check app store reviews
  - Monitor support tickets
  - Watch social media mentions

### Success Metrics

After 48 hours, deployment is considered successful if:

✅ **No increase in crash rate**  
✅ **No increase in database-related errors**  
✅ **No user reports of wallet ordering issues**  
✅ **Database health score = 100 for >95% of users**  
✅ **All wallet operations working normally**

---

## Rollback Procedures

### When to Rollback

Initiate rollback immediately if:

- App crash rate increases by >0.5%
- Database corruption detected in >1% of users
- Critical functionality broken (can't create wallets/transactions)
- Show-stopping bugs reported by >10 users
- Migration causes data loss

### Rollback Step 1: Immediate Stop

```bash
# Halt the rollout immediately
# Revert to previous version in app stores

# For EAS builds:
eas channel:rollback production --channel-id=previous-version-id
```

### Rollback Step 2: Database Restore (if needed)

If users have corrupted data:

```typescript
// Option A: Use automated repair
import { repairDatabaseIntegrity } from './src/lib/db/integrityChecker';
await repairDatabaseIntegrity(dryRun: false);

// Option B: Manual SQL restore
// Run repair-scripts/fix_display_order_corruption.sql
```

### Rollback Step 3: Code Revert

```bash
# Revert to previous working commit
git revert <commit-hash-of-wallet-fix>

# Build and deploy reverted version
npm run build:production
# Deploy using your normal process
```

### Rollback Step 4: User Communication

```
Subject: PocketFlow Update - Temporary Service Interruption

We've temporarily reverted to the previous version of PocketFlow 
due to an issue with wallet ordering. Your data is safe. 
We'll have a fix deployed within 24 hours.

What you need to do: Update to version [previous-version] if you 
experience any wallet display issues.
```

### Rollback Verification

- [ ] Previous version deployed successfully
- [ ] App crash rate returns to normal
- [ ] No new corruption reports
- [ ] Users can access their data
- [ ] All critical operations working

---

## Monitoring and Alerts

### Key Metrics to Monitor

**Database Operations**
```
Metric: db.wallet.create.errors
Alert: > 1% error rate in 5 minutes
Action: Investigate immediately

Metric: db.wallet.reorder.errors  
Alert: > 0.5% error rate in 5 minutes
Action: Consider rollback

Metric: db.wallet.reorder.duration
Alert: > 1000ms p95 latency
Action: Investigate performance
```

**App Health**
```
Metric: app.crash.rate
Alert: > 0.5% increase from baseline
Action: Emergency rollback

Metric: app.database.corruption
Alert: Any detection
Action: Emergency response
```

**User Experience**
```
Metric: user.support.tickets.wallet_order
Alert: > 10 tickets in 1 hour
Action: Investigate and consider rollback
```

### Alert Channels

- **Slack:** #pocketflow-alerts
- **PagerDuty:** On-call engineer
- **Email:** dev-team@pocketflow.com

### Dashboard Links

- App Crash Rate: [Link to monitoring dashboard]
- Database Health: [Link to database monitoring]
- User Metrics: [Link to analytics dashboard]

---

## Troubleshooting

### Issue: Migration Doesn't Run

**Symptoms:** Wallets still have display_order = 0 after update

**Diagnosis:**
```typescript
// Check if migration ran
const wallets = await exec('SELECT * FROM wallets WHERE display_order = 0;');
if (wallets.length > 0) {
  console.log('Migration did not run or failed');
}
```

**Solution:**
1. Check app logs for migration errors
2. Manually trigger repair:
   ```typescript
   import { repairDatabaseIntegrity } from './src/lib/db/integrityChecker';
   await repairDatabaseIntegrity(dryRun: false);
   ```
3. If that fails, run SQL repair script

### Issue: Duplicate display_order Values

**Symptoms:** Multiple wallets have same display_order

**Diagnosis:**
```sql
SELECT display_order, COUNT(*) 
FROM wallets 
GROUP BY display_order 
HAVING COUNT(*) > 1;
```

**Solution:**
```typescript
import { checkDatabaseIntegrity, repairDatabaseIntegrity } from './src/lib/db/integrityChecker';

const issues = await checkDatabaseIntegrity();
console.log('Issues found:', issues);

await repairDatabaseIntegrity(dryRun: false);
```

### Issue: Wallets Jumping After Reorder

**Symptoms:** User reorders wallets, order resets on app refresh

**Diagnosis:**
- Check if display_order values are actually updating
- Verify cache invalidation is working
- Check for race conditions between reorder and refresh

**Solution:**
```typescript
// Force cache clear
import { invalidateWalletCaches } from '../src/lib/cache/queryCache';
invalidateWalletCaches();

// Verify database state
const wallets = await getWallets();
console.log('Wallet order:', wallets.map(w => ({id: w.id, order: w.display_order})));
```

### Issue: Transaction Crashes After Reorder

**Symptoms:** App crashes when creating transaction after reorder

**Diagnosis:**
- Check if wallet IDs are valid
- Verify foreign key relationships
- Check for NULL wallet_id in transactions

**Solution:**
1. Verify wallet still exists:
   ```typescript
   const wallet = await getWallet(walletId);
   if (!wallet || wallet.length === 0) {
     console.error('Wallet not found');
   }
   ```
2. Check transaction table integrity
3. Restore from backup if needed

---

## Communication Plan

### Pre-Deployment

**To:** Development Team  
**When:** 1 day before deployment  
**Message:** "Wallet reorder fix deploying tomorrow. Review runbook and be on standby."

**To:** Support Team  
**When:** 1 day before deployment  
**Message:** "New version deploying with wallet ordering improvements. Users may see one-time reorganization of wallets."

### During Deployment

**To:** Internal Team  
**When:** Deployment starts  
**Message:** "Wallet reorder fix deployment started. Monitoring canary group."

### Post-Deployment

**To:** Users (if issues fixed)  
**When:** 24 hours after successful deployment  
**Message:** "We've fixed wallet ordering issues. Your wallets should now stay in the order you arrange them."

**To:** Internal Team  
**When:** 48 hours post-deployment  
**Message:** "Wallet reorder fix deployment successful. All metrics stable. Monitoring continuing."

### If Rollback Required

**To:** All Stakeholders  
**When:** Immediately after rollback decision  
**Message:** "Rolled back wallet reorder fix due to [reason]. Investigating root cause. Data is safe."

---

## Appendix

### Useful Commands

```bash
# Check database file exists
adb shell ls /data/data/com.pocketflow/databases/

# Pull database for inspection
adb pull /data/data/com.pocketflow/databases/pocketflow.db

# Inspect database
sqlite3 pocketflow.db "SELECT * FROM wallets;"

# Check app logs
adb logcat | grep pocketflow
```

### Contact Information

- **On-Call Engineer:** [Contact info]
- **Database Expert:** [Contact info]
- **Product Owner:** [Contact info]
- **Emergency Escalation:** [Contact info]

### Related Documentation

- [reorder-root-cause.md](./reorder-root-cause.md) - Root cause analysis
- [WALLET_ORDERING_FIX.md](./WALLET_ORDERING_FIX.md) - Original fix documentation
- [tests/wallet-reorder.test.ts](./tests/wallet-reorder.test.ts) - Test suite
- [src/lib/db/integrityChecker.ts](./src/lib/db/integrityChecker.ts) - Repair tools

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-09  
**Next Review:** 2025-12-16
