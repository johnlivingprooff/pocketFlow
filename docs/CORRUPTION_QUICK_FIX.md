# Database Corruption - Quick Fix Guide

## Current Issue
Your database is completely corrupted - all queries failing with `ERR_UNEXPECTED`.

## Automatic Fix (Recommended)

### The fix is now built into the app. Just rebuild and restart:

1. **Rebuild the app:**
   ```powershell
   npx expo prebuild --clean
   cd android
   .\gradlew.bat clean assembleRelease
   cd ..
   npm run release:copy
   ```

2. **Install on device:**
   ```powershell
   adb install "releases/app-release (DATE).apk"
   ```

3. **Watch the recovery process:**
   ```powershell
   adb logcat | Select-String -Pattern "\[DB\]"
   ```

4. **Expected log output:**
   ```
   [DB] Database corruption detected! Attempting recovery...
   [DB] Corrupted database deleted, creating fresh database...
   [DB] Fresh database created successfully
   [DB] Starting transaction table migration checks...
   [DB] Transactions table columns: id, wallet_id, type, amount, ...
   [DB] Category column already exists (or Added category column)
   [DB] Transaction table migrations completed successfully
   ```

## Manual Fix (If Needed)

If automatic recovery doesn't work, manually delete the corrupted database:

```powershell
# Connect to device
adb shell

# Navigate to app data
cd /data/data/com.anonymous.pocketFlow/databases/

# List files
ls -la

# Delete corrupted database
rm pocketflow.db
rm pocketflow.db-shm
rm pocketflow.db-wal

# Exit shell
exit

# Restart app - it will create fresh database
```

## What Happens

1. **On app start:** Integrity check runs automatically
2. **If corrupted:** Database is deleted and recreated
3. **Result:** Fresh database with all tables (no data)
4. **User experience:** App works but all data is gone

## Data Recovery

⚠️ **Warning:** All data will be lost. There is no automatic backup.

If you have a backup file:
1. Go to Settings > Backup & Restore
2. Tap "Restore from Backup"
3. Select your backup file
4. All data will be restored

If you don't have a backup:
- All transactions, wallets, and categories are lost
- This is the trade-off for offline-first architecture
- Consider creating regular backups in Settings

## Why This Happened

Possible causes:
1. App killed during database write
2. Storage corruption
3. SQLite internal error
4. Concurrent access without write queue (now fixed)

## Prevention

The following fixes are now in place to prevent future corruption:

1. ✅ **Write Queue:** All writes serialized (no concurrent access)
2. ✅ **WAL Mode:** Write-ahead logging for crash safety
3. ✅ **Flush on Background:** Queue flushed when app backgrounded
4. ✅ **Corruption Detection:** Automatic check on every start
5. ✅ **Automatic Recovery:** Corrupted DB deleted and recreated

## Monitoring

Watch for corruption in the future:

```powershell
# Check for corruption warnings
adb logcat | Select-String -Pattern "corruption"

# Watch database health
adb logcat | Select-String -Pattern "(SQLITE_BUSY|ERR_UNEXPECTED|prepareAsync)"

# Monitor write queue
adb logcat | Select-String -Pattern "(Write queue|enqueueWrite)"
```

## Files Modified

The following files now include corruption recovery:

- `src/lib/db/index.ts` - Corruption detection in getDb()
- All database operations - Write queue enforced
- All migrations - Enhanced error logging

## Next Steps

1. Rebuild and install app with new fix
2. Watch logcat for recovery process
3. Verify app launches successfully
4. Create a new wallet and transaction to test
5. Background app and verify transaction persists
6. Create regular backups in Settings

## Support

If automatic recovery fails:
1. Check logcat for error messages
2. Try manual deletion (see above)
3. Uninstall and reinstall app (nuclear option)
4. Report any persistent errors with logcat output
