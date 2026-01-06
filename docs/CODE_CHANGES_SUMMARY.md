# pocketFlow Web - Code Changes Reference

Quick reference for all code modifications made to support web platform.

---

## 1. Database Layer (`src/lib/db/index.ts`)

### Change: Add webDriver import
```typescript
// ADD THIS LINE at top with other imports:
import { getWebDatabase } from './webDriver';
```

### Change: Platform-aware database selection
```typescript
// MODIFY the getDbAsync function:
export const getDbAsync = async (): Promise<NitroSQLiteConnection> => {
  if (Platform.OS === 'web') {
    return getWebDatabase();  // NEW: Return web driver on browser
  }
  
  // Existing mobile path unchanged:
  if (_dbAsync) return _dbAsync;
  
  _dbAsync = (async () => {
    const db = await openDb();
    return db;
  })();
  
  return _dbAsync;
};
```

---

## 2. Web Database Driver (`src/lib/db/webDriver.ts`)

### New File - 362 Lines

**Key Exports:**
```typescript
export async function getWebDatabase(): Promise<WebDatabaseConnection>
export async function enqueueWebWrite(callback, name?): Promise<void>
export async function exportWebDatabase(): Promise<Uint8Array>
export async function importWebDatabase(data: Uint8Array): Promise<void>
export async function clearWebDatabase(): Promise<void>
```

**Core Implementation:**
- Uses sql.js for WASM SQLite engine
- IndexedDB for persistent storage
- WriteQueue for write serialization
- Auto-saves to IndexedDB after writes
- Implements NitroSQLiteConnection interface

---

## 3. Data Loading Hooks

### Change: `src/lib/hooks/useWallets.ts`
```typescript
// REMOVE this web guard block:
if (Platform.OS === 'web') {
  return {
    wallets: [],
    balances: {},
    isLoading: true,
    refresh: async () => {},
  };
}

// NOW hook calls DB layer directly on all platforms:
const wallets = await getWallets();  // Works on web via webDriver
```

### Change: `src/lib/hooks/useTransactions.ts`
```typescript
// REMOVE this web guard block:
if (Platform.OS === 'web') {
  return {
    transactions: [],
    isLoading: true,
    hasMore: false,
    loadMore: async () => {},
  };
}

// NOW hook calls DB layer directly on all platforms:
const transactions = await getTransactions(page, pageSize);  // Works on web
```

---

## 4. Root Layout (`app/_layout.tsx`)

### Change: Add WebShell import
```typescript
// ADD at top with other imports:
import { WebShell } from '../src/components/web/WebShell';
```

### Change: Conditional layout rendering
```typescript
// CREATE a helper function to avoid duplication:
const renderStack = () => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    {/* All Stack.Screen definitions here */}
    <Stack.Screen name="transactions/add" ... />
    {/* ... etc */}
  </Stack>
);

// MODIFY return statement:
return (
  <GestureHandlerRootView style={styles.container}>
    {Platform.OS === 'web' ? (
      <WebShell>
        {renderStack()}  {/* Web gets 3-column layout */}
      </WebShell>
    ) : (
      renderStack()     {/* Mobile gets standard Stack */}
    )}
    
    {/* Existing biometric auth overlay */}
    {!isAuthenticated && biometricEnabled && ...}
  </GestureHandlerRootView>
);
```

---

## 5. Alert System

### Change: `app/settings/dev.tsx`

```typescript
// ADD imports:
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/common/ThemedAlert';
import { Platform } from 'react-native';

// GET alert function:
const { showConfirmAlert } = useAlert();

// MODIFY alert handling:
const handleResetOnboarding = async () => {
  if (Platform.OS === 'web') {
    // Use custom alert on web
    showConfirmAlert(
      'Reset Onboarding?',
      'Are you sure? This will restart the onboarding flow.',
      async () => {
        await resetOnboarding();
        showAlert('Onboarding reset. Please restart the app.');
      }
    );
  } else {
    // Use native alert on mobile
    Alert.alert(
      'Reset Onboarding?',
      'Are you sure? This will restart the onboarding flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await resetOnboarding();
            Alert.alert('Success', 'Onboarding reset. Please restart the app.');
          },
        },
      ]
    );
  }
};

// ADD at component return:
{alertComponent}
```

### Change: `app/(tabs)/settings.tsx`

```typescript
// MODIFY RestartOnboarding handler:
const handleRestartOnboarding = async () => {
  // USE existing showConfirmAlert hook:
  showConfirmAlert(
    'Restart Onboarding?',
    'This will take you through the setup again.',
    async () => {
      try {
        await resetOnboarding();
        router.replace('/onboarding/welcome');
      } catch (error) {
        console.error('Failed to restart onboarding:', error);
      }
    }
  );
};
```

---

## 6. Web Layout Components

### New File: `src/components/web/WebShell.tsx` - 176 Lines

**Structure:**
```typescript
interface WebShellProps {
  children: React.ReactNode;
}

export function WebShell({ children }: WebShellProps) {
  // Only renders on Platform.OS === 'web'
  
  // 3-column layout:
  // [LeftRail (64-220px)] [Content (flex:1)] [RightPanel (320px)]
  
  // Responsive collapse < 1024px:
  // [LeftRail collapsed] [Content (flex:1)]
  //                      [RightPanel as drawer]
}
```

**Features:**
- Manages railExpanded and rightPanelOpen state
- Calculates responsive widths
- Renders LeftRail, center children, RightPanel
- Mobile floating button to toggle right panel

---

### New File: `src/components/web/LeftRail.tsx` - 288 Lines

**Navigation Items:**
- 🏠 Home
- 💰 Wallets
- 📊 Analytics
- 🏷️ Categories
- 💼 Budgets
- 🎯 Goals
- **+ Add Transaction** (prominent CTA)

**Features:**
- Active route highlighting
- Collapsible: 64px (icons) ↔ 220px (labels)
- Theme integration
- Touch-friendly hit targets

---

### New File: `src/components/web/RightPanel.tsx` - 486 Lines

**Sections:**
1. **Profile**
   - Avatar (user initials)
   - Name/currency display
   
2. **Theme**
   - Toggle menu: Light/Dark/System
   - Theme integration
   
3. **Storage**
   - Mode toggle: Browser (IndexedDB) vs File
   - Export button (downloads .db file)
   - Import button (uploads .db file)
   
4. **Links**
   - Settings
   - Help/FAQ

**Features:**
- Responsive drawer on mobile
- Database backup/restore functionality
- Theme switching
- Accessible buttons

---

## 7. Package Configuration (`package.json`)

### Addition:
```json
{
  "dependencies": {
    "sql.js": "^1.12.0",  // NEW: WASM SQLite for web
    // ... existing dependencies
  }
}
```

---

## Summary of Changes by Impact

### Minimal (Platform Detection)
- ✅ `app/_layout.tsx` - Conditional layout only
- ✅ `src/lib/db/index.ts` - DB driver selection

### Data Flow (Core Logic Unchanged)
- ✅ `src/lib/hooks/useWallets.ts` - Removed web bypass
- ✅ `src/lib/hooks/useTransactions.ts` - Removed web bypass

### UI Layer (Web-Specific)
- ✅ `src/components/web/WebShell.tsx` - NEW
- ✅ `src/components/web/LeftRail.tsx` - NEW
- ✅ `src/components/web/RightPanel.tsx` - NEW
- ✅ `app/settings/dev.tsx` - Alert handling
- ✅ `app/(tabs)/settings.tsx` - Alert handling

### Database Layer (Web-Specific)
- ✅ `src/lib/db/webDriver.ts` - NEW (362 lines)

### Dependencies
- ✅ `package.json` - Added sql.js

---

## Implementation Statistics

| Category | Count |
|----------|-------|
| Files Created | 4 |
| Files Modified | 5 |
| New Lines of Code | ~1,000 |
| Modified Lines | ~30 |
| Components Added | 3 |
| New Exports | 10+ |

---

## Backward Compatibility

✅ **Mobile Code Path Unaffected**
- All changes behind Platform.OS checks
- Mobile uses native SQLite as before
- No breaking changes to existing APIs
- Existing mobile tests should pass unchanged

✅ **Business Logic Untouched**
- No changes to:
  - Data models
  - Transaction logic
  - Wallet management
  - Analytics calculations
  - Category system
  - Recurring transactions
  - Budget/goal logic

✅ **API Compatibility**
- WebDatabaseDriver implements same interface as NitroSQLiteConnection
- No changes needed in code consuming the DB

---

## Testing Hook

All modifications include this check at startup:
```
if (Platform.OS === 'web') {
  // Web-specific code path
  console.log('[WebDB] Initializing sql.js + IndexedDB...');
} else {
  // Mobile code path (unchanged)
  console.log('[DB] Initializing Nitro SQLite...');
}
```

Check browser console for initialization messages to verify correct path is taken.

---

## Quick Validation

To verify all changes are in place:

```bash
# 1. Check file existence
ls -la src/lib/db/webDriver.ts
ls -la src/components/web/{WebShell,LeftRail,RightPanel}.tsx

# 2. Check imports
grep -n "import.*webDriver" src/lib/db/index.ts
grep -n "import.*WebShell" app/_layout.tsx

# 3. Verify TypeScript
npx tsc --noEmit

# 4. Check dependencies
grep "sql.js" package.json
```

All should return matches without errors.

---

## Next Steps

1. **Install**: `npm install` (to get sql.js)
2. **Test Web**: `npx expo start --web`
3. **Test Mobile**: `npx expo start --ios` or `--android`
4. **Verify**: Follow WEB_TESTING_GUIDE.md

---

## Document Cross-References

For more information, see:
- **Architecture**: `WEB_IMPLEMENTATION_COMPLETE.md`
- **Testing**: `WEB_TESTING_GUIDE.md`
- **Status**: `IMPLEMENTATION_STATUS.md`
- **This Reference**: (current file)

---

**Last Updated**: Implementation Completion
**Version**: 1.0
**Status**: Ready for npm install & testing
