# AGENTS.md - pocketFlow Development Guide
This guide provides coding standards, build commands, and architecture insights for agents working in the pocketFlow repository.
## Build & Test Commands
### Development
```bash
# Install dependencies
npm install
# Start development server
npx expo start
# Platform-specific commands
npx expo start --ios
npx expo start --android
npx expo start --web
# Clear cache if needed
npx expo start -c
```
### Build & Release
```bash
# Copy release builds (Windows PowerShell)
npm run release:copy
# Type checking
npx tsc --noEmit
```
### Testing
```bash
# Run a specific test
npx jest tests/transaction-persistence.test.ts
# Run all tests
npx jest
# Watch mode
npx jest --watch
# Test with coverage
npx jest --coverage
```
**Note:** Tests use Jest. The test database is stored in `pocketflow-test.db`.
---
## Code Style Guidelines
### TypeScript Configuration
- **Strict mode is required** (`strict: true` in `tsconfig.json`)
- **AVOID `any` types** - use `unknown` or proper types instead
- **Path aliases**: `@/` maps to `./src/`
- Use `src/types/` for domain models
- Prefer interfaces for object shapes, types for unions/intersections
### React Native Patterns
- Use **functional components with hooks** (no class components)
- Follow **Expo Router file-based routing**
- Use `expo-router`'s `Link` and `useRouter` for navigation
- Check platform capabilities before using native APIs
- Always use `expo-constants` for app configuration
### Styling
- Use `StyleSheet.create()` for component styles
- Apply theme colors dynamically via `theme()` function
- Support both light and dark modes
- Use semantic colors from `src/theme/theme.ts`:
  - `colors.deepGold` - Primary accent
  - `colors.positiveGreen` - Income/success
  - `colors.negativeRed` - Expense/danger
  - `colors.mutedGrey`, `colors.neutralBeige` - Neutrals
- Add elevation/shadows using `shadows.sm/md lg` from theme
### Notification Bar Padding
**MANDATORY** - All screens must account for notification bar:
- Use `paddingTop: 20` via `ScrollView contentContainerStyle` (preferred)
- OR via `View` wrapper with explicit `paddingTop`
- **Reference**: `app/categories/index.tsx`, `app/(tabs)/index.tsx`, `app/wallets/[id].tsx`
### State Management (Zustand)
- Use stores in `src/store/useStore.ts`:
  - `useSettings` - Theme, currency, biometric settings, user info
  - `useUI` - UI state like active wallet
- Persist important state with Zustand's `persist` + `AsyncStorage`
- Keep component-local state for UI-only concerns
### Database (SQLite) - CRITICAL RULES
1. **Write Queue is MANDATORY** for ALL writes (INSERT/UPDATE/DELETE)
2. Use `enqueueWrite()` or `execRun()` for database modifications
3. Read operations can use `exec()` directly
**Correct pattern:**
```typescript
import { execRun } from '@/lib/db';
await execRun(
  'INSERT INTO transactions (wallet_id, amount, type) VALUES (?, ?, ?)',
  [walletId, amount, type]
);
```
**WRONG (causes SQLITE_BUSY errors):**
```typescript
await db.runAsync(...); // ❌ Never direct!
```
**Why**: SQLite only allows one writer; write queue serializes operations with exponential backoff.
### File Operations
- Receipts: `DocumentDirectory/receipts/YYYY-MM-DD/{filename}.jpg`
- Backups: `DocumentDirectory/backups/pocketFlow_backup_{timestamp}.json`
- Always compress images (max 1000px, 60% quality)
- Use `expo-file-system` for all file operations
### Error Handling
- Use try-catch blocks for async operations
- Log errors via `src/utils/logger.ts`
- Provide user-friendly messages via `Alert.alert()`
- Validate user input before database operations
### Naming Conventions
- Components: `PascalCase` (e.g., `WalletCard`)
- Hooks: `use_lowercase` (e.g., `useWallets`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `EXPENSE_TAXONOMY`)
- Functions/Variables: `camelCase`
- Type names: `PascalCase` with `I` prefix or descriptive suffix
---
## Architecture Overview
### Tech Stack
- **Framework**: React Native + Expo (SDK 54)
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript (strict mode)
- **Database**: expo-sqlite + react-native-nitro-sqlite (Nitro SQLite)
- **State**: Zustand with AsyncStorage persistence
- **Animations**: React Native Reanimated v4
- **Storage**: Expo FileSystem for receipts/backups
### Project Structure
```
pocketFlow/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout + DB initialization
│   ├── (tabs)/            # Tab navigation (home, wallets, analytics, settings)
│   ├── wallets/           # Wallet CRUD screens
│   ├── transactions/      # Transaction screens
│   ├── receipt/           # Receipt scanning
│   └── categories/        # Category management
├── src/
│   ├── components/        # Reusable UI
│   ├── lib/
│   │   ├── db/           # SQLite repositories
│   │   │   ├── writeQueue.ts  # CRITICAL: Write serialization
│   │   │   ├── transactions.ts
│   │   │   ├── wallets.ts
│   │   │   └── categories.ts
│   │   ├── hooks/        # Custom React hooks
│   │   └── services/     # File/OCR/Biometric
│   ├── store/            # Zustand stores
│   ├── theme/            # Theme & colors
│   ├── types/            # TypeScript definitions
│   └── utils/            # Helpers and formatters
└── tests/                # Jest test suite
```
### Database Schema
- `wallets` - Multi-wallet support with currencies and types
- `transactions` - Income/expense/transfer tracking with categories
- All foreign keys and constraints enforced
### Analytics Functions
Available in `src/lib/db/transactions.ts`:
- `analyticsTotalsByMonth(year, month)` - Income vs expense totals
- `analyticsCategoryBreakdown(year, month)` - Spending breakdown
- `totalAvailableAcrossWallets()` - Total available cash
- `getWalletBalance(walletId)` - Individual wallet balance
- **Transfers excluded** from income/expense analytics
### Notification System
**✅ REMINDER NOTIFICATION SYSTEM IMPLEMENTED**
- `expo-notifications` dependency configured (`^0.32.16`)
- Daily expense logging reminders with customizable time
- Quiet hours support (do-not-disturb periods)
- Permission handling with graceful degradation
- Android notification channel configured in app.json
- iOS provisional authorization support
- Deep linking from notifications to transaction add screen
- Reminder settings stored in `useSettings` store:
  - `remindersEnabled`, `reminderPreferredTimeLocal`
  - `reminderQuietHoursStart/End`, `reminderPermissionStatus`
- Service: `src/lib/services/reminderNotificationService.ts`
- Eligibility logic: `src/lib/services/reminderEligibility.ts`
---
## Copilot/Cursor Rules
This repository includes rules from `.github/copilot-instructions.md`. Key highlights:
1. **ALL database writes MUST use write queue** (`enqueueWrite` or `execRun`)
2. **Always use parameterized queries** - never string concatenation
3. **Theme support mandatory** - light/dark mode for all components
4. **Notification padding required** - `paddingTop: 20` on all screens
5. **No `any` types permitted** - strict TypeScript compliance
---
## Quick Start for AI Agents
1. Read this file and `.github/copilot-instructions.md`
2. Check `README.md` for project overview
3. Review `docs/PROJECT_SUMMARY.md` for feature details
4. Examine existing components for patterns (start with `app/(tabs)/index.tsx`)
## Testing Tips
- Run single tests with: `npx jest tests/transaction-persistence.test.ts`
- Test database path: `pocketflow-test.db`
- Verify `enqueueWrite()` usage for all write operations
- Check notification bar padding on every screen
- Test both light and dark themes
---
**Built with ❤️ using Expo Router, TypeScript, and SQLite**
