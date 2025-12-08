# SQLite Data Display Issue Fix - Release Build

## Problem Summary

In the Android release build, newly saved SQLite data would not display in the UI until the app was fully restarted. This issue did not occur in debug builds.

### Symptoms
- User saves a transaction
- Data does not appear in the UI immediately
- After temporarily leaving the app (e.g., tapping a notification), the data is still missing
- Completely restarting the app (swiping it away from recent apps) causes the data to appear
- Only affects release builds, not debug builds

## Root Cause

The issue was caused by a combination of factors:

1. **In-Memory Cache Stale Data**: The app uses an in-memory `QueryCache` for performance optimization. When the app went to background and returned to foreground, this cache contained stale data.

2. **Missing Cache Invalidation on App Resume**: While the cache was properly invalidated after database writes, it was not cleared when the app returned from background.

3. **No Automatic Data Reload**: The home screen and other UI components loaded data on mount but did not automatically reload when the app returned from background.

4. **Release Build Optimizations**: Release builds apply different optimizations than debug builds, which may have exacerbated timing issues between cache invalidation and UI updates.

## Solution

### 1. Cache Invalidation on App Foreground (`app/_layout.tsx`)

When the app transitions from background to foreground, all transaction-related caches are now cleared:

```typescript
const handleAppStateChange = async (nextAppState: AppStateStatus) => {
  if (nextAppState === 'active') {
    if (Platform.OS !== 'web') {
      // Clear all caches to ensure fresh data is loaded
      const { invalidateTransactionCaches } = await import('../src/lib/cache/queryCache');
      invalidateTransactionCaches();
      
      await processRecurringTransactions();
    }
    // ... biometric auth logic
  }
};
```

### 2. AppState Listener in Home Screen (`app/(tabs)/index.tsx`)

The home screen now listens to app state changes and automatically reloads data when the app becomes active:

```typescript
// Listen to app state changes to reload data when app comes to foreground
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && Platform.OS !== 'web') {
      console.log('[Home] App became active, reloading data...');
      setDataVersion(prev => prev + 1);
    }
  });
  
  return () => subscription.remove();
}, []);
```

The `dataVersion` state variable is incremented when the app becomes active, which triggers the main data loading `useEffect` to re-run.

### 3. Enhanced Logging (`src/lib/db/transactions.ts` & `src/lib/cache/queryCache.ts`)

Added diagnostic logging to help identify cache and database timing issues:

- **Database Operations**: Logs timing, transaction details, and timestamps
- **Cache Invalidation**: Logs cache statistics before clearing and confirmation after clearing

Example logs:
```
[DB] Transaction added in 5ms, type: expense, amount: 1000, wallet: 1, timestamp: 2025-12-08T13:30:00.000Z
[Cache] Invalidating all transaction caches at 2025-12-08T13:30:00.000Z
[Cache] Before clear - Analytics: 5 entries, Wallet: 3 entries, Transaction: 2 entries
[Cache] All caches cleared successfully
[Home] App became active, reloading data...
```

## Testing Instructions

### Manual Testing

1. **Build Release APK**:
   ```bash
   eas build --platform android --profile production
   ```

2. **Install on Device**:
   - Install the release APK on a physical Android device
   - Open the app and create a wallet if needed

3. **Test Scenario 1: Add Transaction and Background**:
   - Add a new transaction
   - Verify it appears in the UI immediately
   - Put the app in background (press home button)
   - Open another app or wait a few seconds
   - Return to pocketFlow
   - **Expected**: Transaction should still be visible

4. **Test Scenario 2: Add Transaction, Background, and Notification**:
   - Add a new transaction
   - Put the app in background
   - Tap a notification (calendar, email, etc.)
   - Return to pocketFlow via recent apps
   - **Expected**: Transaction should be visible without restart

5. **Test Scenario 3: Multiple Transactions**:
   - Add 3-5 transactions in quick succession
   - Put the app in background immediately
   - Return to the app
   - **Expected**: All transactions should be visible

6. **Test Scenario 4: Pull to Refresh**:
   - Add a transaction
   - Pull down to refresh the home screen
   - **Expected**: Transaction remains visible and data is refreshed

### Log Verification

Enable debug logging on Android to verify the fix:

```bash
adb logcat | grep -E "\[DB\]|\[Cache\]|\[Home\]"
```

You should see logs indicating:
1. Database writes completing successfully
2. Cache invalidation happening after writes
3. App state changes triggering data reloads
4. Cache being cleared when app returns to foreground

**Note**: By default, diagnostic logs only appear in development builds. To enable logging in production for debugging purposes, add this to your `app.json`:

```json
{
  "expo": {
    "extra": {
      "enableLogging": true
    }
  }
}
```

Then rebuild the app with:
```bash
eas build --platform android --profile production
```

## Additional Notes

### Performance Considerations

- The fix adds minimal overhead: cache invalidation is O(1) and data reloading only happens on app foreground transition
- Existing `useFocusEffect` hooks in other screens already handle screen-to-screen navigation
- The in-memory cache still provides performance benefits during normal app usage

### Why This Didn't Affect Debug Builds

Debug builds may have:
- Different JavaScript optimization levels
- Different timing for async operations
- Hot reloading that inadvertently refreshes data
- Less aggressive code minification and optimization

### Related Files

- `app/_layout.tsx` - App-level lifecycle handling
- `app/(tabs)/index.tsx` - Home screen with AppState listener
- `src/lib/cache/queryCache.ts` - Cache implementation and invalidation
- `src/lib/db/transactions.ts` - Database transaction operations
- `src/lib/hooks/useWallets.ts` - Wallet data hook (uses useFocusEffect)
- `src/lib/hooks/useTransactions.ts` - Transaction data hook (uses useFocusEffect)

## Future Improvements

1. **Persistent Cache**: Consider using AsyncStorage or SQLite for caching to persist across app restarts
2. **Cache TTL Tuning**: Experiment with different TTL values for different data types
3. **Background Sync**: Implement background data synchronization
4. **ProGuard Rules**: Add specific rules for Expo SQLite if needed (though Expo manages this)

## Verification Checklist

- [x] Cache is cleared when app returns from background
- [x] Home screen reloads data when app becomes active
- [x] Database writes complete before cache invalidation
- [x] Diagnostic logging added for troubleshooting
- [x] Conditional logging to avoid production performance impact
- [x] Code review completed - all feedback addressed
- [x] CodeQL security scan passed - no vulnerabilities found
- [ ] Tested on physical Android device with release build
- [ ] Verified logs show expected behavior
- [ ] Confirmed data displays immediately after saving
- [ ] Confirmed data persists after backgrounding and returning
