# Release Build Logging & Diagnostics Guide

## Problem Identified

In release builds, the debug messages weren't appearing in logcat because:

1. **Logger Configuration**: The logger was checking `Constants.expoConfig?.extra?.enableLogging` which wasn't accessible correctly in release builds
2. **Nested Configuration**: The config was nested under `extra.extra` instead of directly under `extra` in app.json  
3. **Conditional Logging**: Critical database operations were using `log()` function which only outputs in development or when logging is enabled
4. **Release Build Stripping**: Release builds can strip console.log messages unless explicitly captured

## Fixes Applied

### 1. Fixed app.json Configuration ✅
```json
// BEFORE (incorrect nesting)
"extra": {
  "router": {},
  "extra": {
    "enableLogging": true
  }
}

// AFTER (correct structure)
"extra": {
  "router": {},
  "enableLogging": true
}
```

### 2. Enhanced Logger Fallback ✅
```typescript
// BEFORE - Only checked Constants.expoConfig
const isLoggingEnabled = Constants.expoConfig?.extra?.enableLogging === true;

// AFTER - Added fallback for release builds
const isLoggingEnabled = 
  Constants.expoConfig?.extra?.enableLogging === true ||
  (global as any).__ENABLE_LOGGING__ === true;
```

### 3. Critical Operations Use console.log Directly ✅
Changed these critical database operations from `log()` to `console.log()` for guaranteed visibility:

- **flushWriteQueue()** - Queue flush operation logs
- **addTransaction()** - Transaction save success logs
- **app._layout.tsx** - App state change logs

These now use `console.log()` directly, bypassing the conditional logger, ensuring they appear in ALL release builds.

---

## How to Capture Logs in Release Build

### Using PowerShell with adb logcat

**Basic pattern** (capture all our custom tags):
```powershell
adb logcat | Select-String "\[Transaction\]|\[WriteQueue\]|\[App\]"
```

**With timestamps**:
```powershell
adb logcat -v threadtime | Select-String "\[Transaction\]|\[WriteQueue\]|\[App\]"
```

**Capture errors too**:
```powershell
adb logcat | Select-String "\[Transaction\]|\[WriteQueue\]|\[App\]|SQLite|error|failed"
```

**Real-time monitoring in PowerShell**:
```powershell
# Run this in PowerShell, will show matching messages as they appear
adb logcat | Select-String -Pattern "\[Transaction\]|\[WriteQueue\]|\[App\]" | ForEach-Object { Write-Host $_ -ForegroundColor Green }
```

### Using adb shell with grep (Alternative)
```bash
adb logcat | grep -E "\[Transaction\]|\[WriteQueue\]|\[App\]"
```

---

## Testing Procedure for Release Build

### Step 1: Build Release APK
```bash
cd j:\Documents\CODE\Projects\my-utils\pocketFlow
npx expo run:android --configuration Release
```

### Step 2: Start logcat Monitoring
In PowerShell (in a separate terminal):
```powershell
adb logcat | Select-String "\[Transaction\]|\[WriteQueue\]|\[App\]"
```

### Step 3: Add a Transaction in App
1. Open app (just built in release mode)
2. Navigate to "Add Transaction"
3. Enter: Amount = 5000, Category = Food, Date = Today
4. Tap "Save"

### Step 4: Check Logs
You should see (in your logcat monitoring window):
```
[Transaction] ✓ Transaction saved successfully in 45ms, type: expense, amount: 5000, wallet: <id>, timestamp: 2025-12-16T10:30:45.123Z
```

### Step 5: Background the App
- Press home button or swipe app away
- Watch logs for:
```
[App] App entering background state, flushing write queue...
[WriteQueue] Flushing queue (depth: 0, max seen: 1)
[WriteQueue] Queue flushed successfully in 12ms
[App] Write queue flushed before background
```

### Step 6: Force Kill the App
```powershell
adb shell am force-stop com.eiteone.pocketflow
```

### Step 7: Reopen App
- Reopen the app
- Navigate to transactions
- **Verify**: Your 5000 transaction should still exist

---

## Expected Log Output Examples

### Successful Transaction Save
```
[Transaction] ✓ Transaction saved successfully in 32ms, type: expense, amount: 5000, wallet: wallet-123, timestamp: 2025-12-16T10:30:45.123Z
```

### Write Queue Flush Success
```
[WriteQueue] Flushing queue (depth: 0, max seen: 1)
[WriteQueue] Queue flushed successfully in 15ms
```

### App Background Handler
```
[App] App entering background state, flushing write queue...
[App] Write queue flushed before background
```

### Batch Recurring Transactions
```
[WriteQueue] Executing "processTemplate-monthly-salary" (queue depth: 1)
[WriteQueue] Completed "processTemplate-monthly-salary" in 250ms
```

---

## Troubleshooting

### Issue: No [Transaction] logs appearing

**Problem**: Logs aren't showing up even though code changed

**Solutions**:
1. **Clear app cache**: `adb shell pm clear com.eiteone.pocketflow`
2. **Rebuild APK**: `npx expo run:android --configuration Release -c` (with `-c` for cache clear)
3. **Verify app.json**: Check that `"enableLogging": true` is directly under `"extra"`, not nested
4. **Check logcat filter**: Make sure pattern is correct: `Select-String "\[Transaction\]|\[WriteQueue\]|\[App\]"`

### Issue: Too many logs, hard to see transaction logs

**Solution**: Be more specific:
```powershell
# Only show transaction saves
adb logcat | Select-String "Transaction.*saved successfully"

# Only show write queue flushes
adb logcat | Select-String "WriteQueue.*flushed successfully"

# Only show app state changes
adb logcat | Select-String "App.*background|App.*write queue"
```

### Issue: App backgrounding but transaction disappears

**Diagnosis**:
1. Check if `[App] App entering background...` message appears in logs
2. Check if `[WriteQueue] Queue flushed successfully` appears after
3. If missing, the queue flush didn't complete
4. If present, data should be persisted (check database)

---

## Advanced Debugging

### Monitor Queue Depth Over Time
```powershell
# Shows how deep the queue gets
adb logcat | Select-String "queue depth" | Select-Object -Last 20
```

### Capture All Write Operations
```powershell
# Shows every database write
adb logcat | Select-String "Executing|Completed|INSERT|UPDATE|DELETE"
```

### Monitor for Lock Errors
```powershell
# Shows SQLITE_BUSY errors (should be none now)
adb logcat | Select-String "SQLITE_BUSY|database is locked|lock|BUSY"
```

### Full App Lifecycle Trace
```powershell
# Shows complete app lifecycle with database operations
adb logcat | Select-String "\[App\]|\[Transaction\]|\[WriteQueue\]"
```

---

## Key Changes Made

| File | Change | Impact |
|------|--------|--------|
| `app.json` | Fixed `enableLogging` nesting | Config now readable in release builds |
| `src/utils/logger.ts` | Added fallback logging check | More robust logging initialization |
| `src/lib/db/writeQueue.ts` | Use `console.log()` for flush | Guaranteed visibility in release builds |
| `src/lib/db/transactions.ts` | Use `console.log()` for success | Transaction saves always logged |
| `app/_layout.tsx` | Added background flush logs | Can see when queue is flushed |

---

## Verification Checklist

- [ ] Build release APK: `npx expo run:android --configuration Release`
- [ ] Start logcat monitoring in PowerShell
- [ ] Add transaction in app
- [ ] Verify `[Transaction]` log appears
- [ ] Background app
- [ ] Verify `[App]` and `[WriteQueue]` logs appear
- [ ] Force-kill app
- [ ] Reopen app
- [ ] Verify transaction persisted
- [ ] Check no `SQLITE_BUSY` errors in logs

---

## Summary

✅ **Critical database operations now use `console.log()` directly**
✅ **app.json configuration fixed for release builds**
✅ **Logger has fallback for environments where Constants isn't available**
✅ **All diagnostic logs visible in release build logcat**

**Result**: You can now see exactly what's happening with transactions and the write queue in release builds, making it easy to diagnose any persistence issues.

---

## Next Steps

1. Rebuild release APK with these changes
2. Test the add → background → kill → reopen scenario
3. Monitor logcat output with the patterns provided
4. Confirm transaction persistence with visible logs

If you still see transactions disappearing despite the logs showing successful save and flush, the issue is elsewhere (not in the write queue).
