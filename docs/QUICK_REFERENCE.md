# pocketFlow - Quick Reference

## 🚀 Start Commands
```bash
npm install              # Install dependencies
npx expo start          # Start dev server
npx expo start --ios    # Run on iOS
npx expo start --android # Run on Android
npx expo start --web    # Run in browser
```

## 📱 Main Screens

| Route | Description |
|-------|-------------|
| `/` | Home dashboard with wallet carousel & analytics |
| `/wallets` | List all wallets |
| `/wallets/create` | Create new wallet |
| `/wallets/[id]` | Wallet detail page |
| `/transactions/add` | Add income/expense with receipt |
| `/transactions/history` | Transaction list with filters |
| `/receipt/scan` | Receipt camera capture |
| `/settings` | Theme, currency, biometric |
| `/onboarding` | Welcome screen |

## 🎨 Theme Colors
```typescript
import { colors } from './src/theme/theme';

colors.mutedGrey     // #6B6658
colors.nearBlack     // #010000
colors.neutralBeige  // #B3B09E
colors.deepGold      // #84670B (accent)
colors.earthyBrown   // #332D23
```

## 🗄️ Database Functions

### Wallets (`src/lib/db/wallets.ts`)
```typescript
createWallet(wallet)           // Create new wallet
updateWallet(id, updates)      // Update wallet fields
deleteWallet(id)               // Delete wallet
getWallets()                   // Get all wallets
getWallet(id)                  // Get single wallet
setPrimaryWallet(id)           // Set primary wallet
getWalletBalance(id)           // Calculate live balance
```

### Transactions (`src/lib/db/transactions.ts`)
```typescript
addTransaction(transaction)    // Add income/expense
updateTransaction(id, updates) // Update transaction
deleteTransaction(id)          // Delete transaction
getTransactions(page, size)    // Paginated list
filterTransactions(options)    // Filter by date/wallet/category
```

### Analytics
```typescript
analyticsTotalsByMonth(year, month)     // Income vs expense
analyticsCategoryBreakdown(year, month) // Spending by category
totalAvailableAcrossWallets()           // Total balance
```

## 🎣 React Hooks

```typescript
import { useWallets } from './src/lib/hooks/useWallets';
import { useTransactions } from './src/lib/hooks/useTransactions';
import { useSettings } from './src/store/useStore';

// In component:
const { wallets, balances, loading } = useWallets();
const { transactions, loading } = useTransactions(page);
const { themeMode, defaultCurrency } = useSettings();
```

## 📸 Receipt Images

```typescript
import { saveReceiptImage } from './src/lib/services/fileService';

// After picking/capturing image:
const uri = await saveReceiptImage(filename, base64Data);
// Saved to: DocumentDirectory/receipts/YYYY-MM-DD/{filename}
```

## 💾 Backup/Restore

```typescript
import { exportData, importData } from './src/lib/services/fileService';

// Export all data:
const backupUri = await exportData({ wallets, transactions });

// Import from file:
const data = await importData(fileUri);
```

## 🎯 Transaction Categories
```typescript
import { CATEGORIES } from './src/constants/categories';
// ['Food', 'Transport', 'Rent', 'Offering', 'Salary', ...]
```

## 🔐 Biometric Authentication

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const supported = await LocalAuthentication.hasHardwareAsync();
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Authenticate to continue'
});
```

## 📊 Example Usage

### Create a wallet and add expense:
```typescript
import { createWallet } from './src/lib/db/wallets';
import { addTransaction } from './src/lib/db/transactions';

// Create wallet
await createWallet({
  name: 'Cash',
  currency: 'USD',
  initial_balance: 500,
  type: 'Cash'
});

// Add expense
await addTransaction({
  wallet_id: 1,
  type: 'expense',
  amount: 25.50,
  category: 'Food',
  date: new Date().toISOString(),
  notes: 'Lunch at cafe'
});
```

### Get analytics:
```typescript
import { 
  analyticsTotalsByMonth, 
  totalAvailableAcrossWallets 
} from './src/lib/db/transactions';

const { income, expense } = await analyticsTotalsByMonth(2025, 11);
const total = await totalAvailableAcrossWallets();
```

## 🐛 Debug Commands
```bash
npx expo start -c              # Clear cache
npx tsc --noEmit               # Check TypeScript
npm run android                # Run on Android
npm run ios                    # Run on iOS
```

## 📁 Key Files
- `app/_layout.tsx` - DB initialization
- `src/lib/db/index.ts` - Database connection
- `src/theme/theme.ts` - Color palette
- `src/store/useStore.ts` - Global state
- `app.json` - Expo configuration
- `tsconfig.json` - TypeScript config

## 🎨 Component Examples

### Using themed components:
```tsx
import { WalletCard } from './src/components/WalletCard';
import { TransactionItem } from './src/components/TransactionItem';
import { AddButton } from './src/components/AddButton';

<WalletCard 
  name="Cash"
  balance={500}
  currency="USD"
  mode="light"
/>

<AddButton 
  label="Add Expense"
  onPress={() => {}}
/>
```

---
**📖 Full docs:** See `README.md`, `STRUCTURE.md`, `PROJECT_SUMMARY.md`

##  Goals & Budgets (NEW!)

### Goals (src/lib/db/goals.ts)
Track income-based savings targets with automatic progress updates.

See GOALS_BUDGETS_README.md for full documentation.

**Key Functions**:
- createGoal(input) - Create a new goal
- getGoalWithMetrics(id) - Get goal with calculated metrics
- recalculateGoalProgress(id) - Update progress from wallet income
- getGoalsByWallet(walletId) - Get goals for a wallet
- getAtRiskGoals() - Get goals not on track

**Key Metrics**:
- progressPercentage (0-100)
- daysRemaining (until deadline)
- monthlyRequired (amount needed per month)
- onTrack (boolean)

### Budgets (src/lib/db/budgets.ts)
Track spending limits for categories with automatic spending updates.

See GOALS_BUDGETS_README.md for full documentation.

**Key Functions**:
- createBudget(input) - Create a new budget
- getBudgetWithMetrics(id) - Get budget with calculated metrics
- recalculateBudgetSpending(id) - Update spending from category expenses
- getBudgetsByWallet(walletId) - Get budgets for a wallet
- getOverBudgets() - Get budgets exceeding limit
- getApproachingLimitBudgets() - Get budgets near limit (>75%)

**Key Metrics**:
- percentageUsed (0-100)
- remainingBalance (limit - spent)
- isOverBudget (boolean)
- averageDailySpend (daily average)

### Goals & Budgets Documentation
- GOALS_BUDGETS_README.md - START HERE
- GOALS_BUDGETS_SUMMARY.md - Overview
- GOALS_BUDGETS_SPEC.md - Full specification
- GOALS_BUDGETS_FLOWDIAGRAMS.md - Architecture diagrams
- GOALS_BUDGETS_IMPLEMENTATION_GUIDE.md - Developer guide
- TRANSACTION_INTEGRATION_GUIDE.md - CRITICAL for transaction integration
