# pocketFlow - Copilot Instructions

This file provides guidance for GitHub Copilot when working on the pocketFlow codebase.

## Project Overview

pocketFlow is an **offline-first personal finance tracker** built with React Native, Expo, and TypeScript. All data is stored locally using SQLite with file-based receipt storage. The app tracks multiple wallets, transactions, and provides analytics.

## Tech Stack

- **Framework**: React Native + Expo (SDK 54)
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript (strict mode enabled)
- **Database**: expo-sqlite with async API (`openDatabaseAsync`)
- **State Management**: Zustand with AsyncStorage persistence
- **Animations**: React Native Reanimated v4
- **Styling**: Inline styles with theme system
- **File Storage**: Expo FileSystem for receipts and backups

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platforms
npx expo start --ios
npx expo start --android
npx expo start --web

# Clear cache if needed
npx expo start -c
```

### Build & Release
```bash
# Copy release builds (Windows PowerShell script)
npm run release:copy
```

### Type Checking
```bash
# Check TypeScript types
npx tsc --noEmit
```

## Project Structure

```
pocketFlow/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx            # Root layout with DB initialization
│   ├── (tabs)/                # Tab-based navigation screens
│   │   ├── index.tsx          # Home dashboard
│   │   ├── wallets.tsx        # Wallets screen
│   │   ├── analytics.tsx      # Analytics screen
│   │   └── settings.tsx       # Settings screen
│   ├── wallets/               # Wallet management screens
│   ├── transactions/          # Transaction screens
│   ├── categories/            # Category management
│   └── receipt/               # Receipt scanning
├── src/                       # Business logic & reusable code
│   ├── components/            # Reusable UI components
│   ├── constants/             # App constants (categories, currencies)
│   ├── lib/
│   │   ├── db/               # SQLite database layer
│   │   ├── hooks/            # React hooks
│   │   └── services/         # Business services (file, OCR, biometric)
│   ├── store/                # Zustand state stores
│   ├── theme/                # Theme & color definitions
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
└── assets/                   # Static assets (icons, images)
```

## Coding Conventions

### TypeScript
- **ALWAYS** use strict TypeScript mode (already enabled in `tsconfig.json`)
- **AVOID** using `any` type; prefer proper typing or `unknown`
- Use path aliases: `@/` maps to `./src/`
- Define types in `src/types/` for domain models
- Use interfaces for object shapes, types for unions/intersections

### React Native & Expo
- Use functional components with hooks (no class components)
- Follow Expo Router file-based routing conventions
- Use `expo-router`'s `Link` and `useRouter` for navigation
- Always check platform capabilities before using native APIs
- Use `expo-constants` for app configuration

### Component Structure
```tsx
// Example component structure
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';

export function ComponentName() {
  const { themeMode } = useSettings();
  const colors = theme(themeMode);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>Content</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});
```

### Styling
- Use inline StyleSheet.create() for component styles
- Apply theme colors dynamically using the theme function
- Support both light and dark modes
- Use semantic color names from `src/theme/theme.ts`:
  - `colors.deepGold` - Primary accent color
  - `colors.positiveGreen` - Income/success
  - `colors.negativeRed` - Expense/danger
  - `colors.mutedGrey`, `colors.neutralBeige` - Neutrals
- Add elevation/shadows using `shadows.sm`, `shadows.md` from theme
- Follow responsive design principles (test on various screen sizes)

### State Management
- Use Zustand stores in `src/store/useStore.ts`
- **Settings Store** (`useSettings`): Theme, currency, biometric settings, user info
- Persist important state using Zustand's persist middleware with AsyncStorage
- Keep component-local state for UI-only concerns
- Use React hooks (`useState`, `useEffect`) for component state

### Database (SQLite)
- Database initialization happens in `app/_layout.tsx`
- All database operations are in `src/lib/db/`
- Use async/await for all database operations
- Always use parameterized queries to prevent SQL injection
- **CRITICAL**: All database write operations (INSERT, UPDATE, DELETE) MUST be wrapped in `enqueueWrite()` from `src/lib/db/writeQueue.ts`
- Transaction operations: `src/lib/db/transactions.ts`
- Wallet operations: `src/lib/db/wallets.ts`
- Category operations: `src/lib/db/categories.ts`

**Write Queue Pattern (MANDATORY for all writes):**
```typescript
// CORRECT - Write operations wrapped in enqueueWrite
import { enqueueWrite } from '@/lib/db/writeQueue';

await enqueueWrite(async () => {
  await db.runAsync(
    'INSERT INTO transactions (wallet_id, amount, type) VALUES (?, ?, ?)',
    [walletId, amount, type]
  );
}, 'insertTransaction'); // Operation name for logging

// Also correct - Using execRun which wraps in enqueueWrite automatically
import { execRun } from '@/lib/db';

await execRun(
  'INSERT INTO transactions (wallet_id, amount, type) VALUES (?, ?, ?)',
  [walletId, amount, type]
);

// BAD - Direct db.runAsync without write queue
await db.runAsync(...); // ❌ Will cause SQLITE_BUSY errors!

// BAD - String concatenation (SQL injection risk)
await execRun(
  `INSERT INTO transactions (wallet_id, amount) VALUES (${walletId}, ${amount})`
); // ❌ SQL Injection vulnerability!
```

**Why the Write Queue is Critical:**
- SQLite only allows one writer at a time
- Without write queue serialization, concurrent writes cause `SQLITE_BUSY: "database is locked"` errors
- The write queue automatically retries with exponential backoff on lock errors
- **Rule**: If your function calls `db.runAsync()`, `database.runAsync()`, or modifies data, it MUST use `enqueueWrite()`

**Checking Your Work:**
- Search for `await db.runAsync` - all results should be inside an `enqueueWrite()` callback or use `execRun()`
- Search for `database.runAsync` - same requirement
- Use `execRun()` instead of `db.runAsync()` for INSERT/UPDATE/DELETE when possible


### File Operations
- Receipt images: `DocumentDirectory/receipts/YYYY-MM-DD/{filename}.jpg`
- Backup files: `DocumentDirectory/backups/pocketFlow_backup_{timestamp}.json`
- Always compress images before saving (max 1000px width, 60% quality)
- Use `expo-file-system` for all file operations
- Implement error handling for file operations

### Error Handling
- Use try-catch blocks for async operations
- Log errors using `src/utils/logger.ts`
- Provide user-friendly error messages
- Handle network errors gracefully (app is offline-first)
- Validate user input before database operations

Example error handling:
```typescript
try {
  await saveTransaction(transaction);
} catch (error) {
  console.error('Failed to save transaction:', error);
  Alert.alert('Error', 'Could not save transaction. Please try again.');
}
```

### Security & Data Privacy
- All data is stored locally (offline-first)
- Use parameterized queries to prevent SQL injection
- Implement biometric authentication for app access (optional feature)
- Never expose sensitive data in logs
- Validate and sanitize all user inputs
- Receipt images are stored locally, not uploaded

### Categories & Constants
- Expense categories: Food, Transport, Rent, Groceries, Utilities, Shopping, Healthcare, Entertainment, Education, Bills, Transfer, Other
- Income categories: Salary, Freelance, Business, Investment, Gift, Offering, Transfer, Other Income
- Default currency: MWK (Malawian Kwacha), configurable per user
- Support multiple currencies per wallet

### Analytics & Reporting
- Available analytics functions in `src/lib/db/transactions.ts`:
  - `analyticsTotalsByMonth(year, month)` - Income vs expense totals
  - `analyticsCategoryBreakdown(year, month)` - Spending by category
  - `totalAvailableAcrossWallets()` - Total available cash
  - `getWalletBalance(walletId)` - Individual wallet balance
- Transfers are excluded from income/expense analytics
- Calculate balances: `initial_balance + income - expense`

## Component Patterns

### Themed Components
Always support light/dark mode using the theme system:

```tsx
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';

export function ThemedComponent() {
  const { themeMode } = useSettings();
  const colors = theme(themeMode);
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary }}>Text</Text>
    </View>
  );
}
```

### Using Hooks
- `useWallets()` - Fetch all wallets with live balances
- `useTransactions()` - Fetch paginated transactions
- Custom hooks are in `src/lib/hooks/`

### Navigation
Use Expo Router navigation:
```tsx
import { useRouter } from 'expo-router';

export function Screen() {
  const router = useRouter();
  
  const navigate = () => {
    router.push('/wallets/create');
  };
  
  return <Button onPress={navigate}>Create Wallet</Button>;
}
```

## Testing & Quality

### Manual Testing Checklist
- Test on both iOS and Android platforms
- Test light and dark themes
- Test with different currencies
- Test offline functionality
- Test image compression and storage
- Test database migrations (if adding new tables/columns)
- Verify accessibility labels on interactive elements

### Code Quality
- Run `npx tsc --noEmit` to check for TypeScript errors
- Ensure no `any` types are used
- Add JSDoc comments for complex functions
- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names

## Common Patterns

### Adding a New Screen
1. Create file in `app/` directory (e.g., `app/new-screen.tsx`)
2. Use Expo Router conventions for file naming
3. Implement themed styling with `useSettings` and `theme()`
4. Add navigation links using `<Link>` or `useRouter()`

### Adding a New Database Table
1. Update schema in `src/lib/db/index.ts` (`ensureTables` function)
2. Create repository file in `src/lib/db/` (e.g., `newTable.ts`)
3. Define TypeScript types in `src/types/`
4. Use parameterized queries for all operations

### Adding a New Feature
1. Plan data model changes (if needed)
2. Update database schema and types
3. Create/update UI components
4. Add business logic in services or hooks
5. Test thoroughly in both light and dark themes
6. Update relevant documentation

## Performance Considerations

- Use `React.memo()` for expensive components
- Implement pagination for large lists
- Compress images before storage
- Use `FlatList` for long lists (with `keyExtractor`)
- Debounce search inputs
- Lazy load heavy screens

## Accessibility

- Add `accessibilityLabel` to all interactive elements
- Use semantic HTML/React Native elements
- Support screen readers
- Ensure sufficient color contrast (theme already compliant)
- Test with TalkBack (Android) and VoiceOver (iOS)

## Known Limitations & Future Enhancements

- No cloud sync (offline-first design)
- OCR service is stubbed (`src/lib/services/ocrService.ts`)
- No automated tests (manual testing required)
- Charts use basic implementations (can be enhanced)

## Getting Help

- Check `README.md` for setup instructions
- Review `PROJECT_SUMMARY.md` for complete feature overview
- See `STRUCTURE.md` for detailed file structure
- Examine existing components for patterns

## Notes for AI/Copilot

- This is a **mobile-first** app; always consider mobile UX
- Prioritize **offline functionality** - no external API dependencies
- Keep the app **lightweight** and **fast**
- Maintain **TypeScript strict mode** compliance
- Follow existing **color palette** from logo
- All features should work **without internet connection**
- Security is critical: validate inputs, use parameterized queries
- **Never** introduce external dependencies for core features unless absolutely necessary
