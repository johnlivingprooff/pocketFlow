# Financial Goals & Budgets Implementation Specification

## System Architecture Overview

PocketFlow's Goals and Budgets system provides two parallel tracking mechanisms:
- **Goals**: Income-based targets accumulating toward a specific amount by a deadline
- **Budgets**: Spending limits for expense categories within defined periods

Both systems integrate with the transaction layer to provide automatic, real-time progress updates.

---

## 1. DATA STRUCTURES

### 1.1 Financial Goals

```typescript
interface Goal {
  id?: number;
  name: string;                    // e.g., "Emergency Fund", "Vacation"
  targetAmount: number;            // Amount to accumulate
  currentProgress: number;         // Sum of income toward this goal
  targetDate: string;              // ISO 8601 date (e.g., "2025-12-31")
  notes?: string;                  // User notes/strategy
  linkedWalletId: number;          // Wallet that accumulates toward goal
  createdAt?: string;              // ISO 8601 timestamp
  updatedAt?: string;              // ISO 8601 timestamp
}

interface GoalWithMetrics extends Goal {
  progressPercentage: number;      // 0-100
  daysRemaining: number;           // Days until targetDate
  monthlyRequired: number;         // Amount needed per month to reach target
  onTrack: boolean;                // Is current pace sustainable?
}
```

### 1.2 Budgets

```typescript
interface Budget {
  id?: number;
  name: string;                    // e.g., "Groceries", "Entertainment"
  categoryId?: number;             // Expense category (required for validation)
  subcategoryId?: number;          // Optional: budget for specific subcategory
  limitAmount: number;             // Spending cap
  currentSpending: number;         // Sum spent in current period
  periodType: 'weekly' | 'monthly' | 'custom';  // Recurrence pattern
  startDate: string;               // ISO 8601: period start
  endDate: string;                 // ISO 8601: period end
  notes?: string;                  // User notes
  linkedWalletId: number;          // Wallet being tracked
  createdAt?: string;
  updatedAt?: string;
}

interface BudgetWithMetrics extends Budget {
  remainingBalance: number;        // limitAmount - currentSpending
  percentageUsed: number;          // (currentSpending / limitAmount) * 100
  isOverBudget: boolean;           // currentSpending > limitAmount
  daysRemaining: number;           // Days until period end
  averageDailySpend: number;       // currentSpending / daysElapsed
}
```

---

## 2. DATABASE SCHEMA

### 2.1 Goals Table

```sql
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_progress REAL NOT NULL DEFAULT 0,
  target_date TEXT NOT NULL,           -- ISO 8601
  notes TEXT,
  linked_wallet_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,             -- ISO 8601 timestamp
  updated_at TEXT NOT NULL,             -- ISO 8601 timestamp
  FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  CHECK(target_amount > 0),
  CHECK(current_progress >= 0)
);
```

### 2.2 Budgets Table

```sql
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER,                  -- For expense tracking
  subcategory_id INTEGER,               -- Optional: subcategory budget
  limit_amount REAL NOT NULL,
  current_spending REAL NOT NULL DEFAULT 0,
  period_type TEXT NOT NULL CHECK(period_type IN ('weekly', 'monthly', 'custom')),
  start_date TEXT NOT NULL,             -- ISO 8601
  end_date TEXT NOT NULL,               -- ISO 8601
  notes TEXT,
  linked_wallet_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY(subcategory_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  CHECK(limit_amount > 0),
  CHECK(current_spending >= 0)
);
```

---

## 3. CORE LOGIC FLOWS

### 3.1 Goal Creation Flow

1. User taps "Create Goal" → Goal form opens
2. User enters: name, target amount, target date, linked wallet, optional notes
3. System validates: amount > 0, date is future, wallet exists
4. System creates goal entry with `currentProgress = 0`
5. System sets up transaction listener for linked wallet
6. On success: navigate to goal detail screen
7. On failure: display error alert with actionable message

### 3.2 Goal Progress Tracking

**Trigger**: New income transaction added to linked wallet

1. Check transaction type == 'income'
2. Check transaction wallet matches `linkedWalletId`
3. Add transaction amount to `currentProgress`
4. Recalculate `progressPercentage`, `daysRemaining`, `onTrack`
5. Update `updated_at` timestamp
6. Persist changes via write queue

**On edit/delete transaction**:
1. Recalculate `currentProgress` from scratch (sum all income in wallet since goal creation)
2. Update metrics
3. Persist

### 3.3 Budget Creation Flow

1. User taps "Create Budget" → Budget form opens
2. User enters: name, category/subcategory, limit amount, period, linked wallet, optional notes
3. System validates: category exists, amount > 0, wallet exists, date range is valid
4. System calculates `startDate` and `endDate` based on periodType
5. System sets `currentSpending = 0`
6. System creates budget entry
7. System recalculates spending from existing transactions in this period/category/wallet
8. On success: show budget detail with initial metrics
9. On failure: surface descriptive error

### 3.4 Budget Spending Tracking

**Trigger**: New expense transaction added to linked wallet with matching category

1. Check transaction type == 'expense'
2. Check transaction wallet matches `linkedWalletId`
3. Check transaction category matches `categoryId` or `subcategoryId`
4. Check transaction date is within `[startDate, endDate]`
5. Add transaction amount to `currentSpending`
6. Recalculate `remainingBalance`, `percentageUsed`, `isOverBudget`
7. Update `updated_at`
8. Persist

**On edit/delete transaction**:
1. Recalculate `currentSpending` from scratch
2. Update metrics
3. Persist

**On period rollover**:
1. Check if `endDate` has passed
2. If yes, create new budget entry with next period dates
3. Mark old budget as archived (or store historique)

---

## 4. ERROR HANDLING STRATEGY

### 4.1 Save Failures
- Never fail silently
- Log all errors with context (operation, data, error message)
- Display user-friendly alerts: "Failed to create goal. Please check your input and try again."
- Provide retry mechanism
- In debug builds: show full error trace

### 4.2 Validation Errors
- **Amount validation**: Must be > 0
- **Date validation**: Target date must be in future (goals), start < end (budgets)
- **Wallet validation**: Wallet must exist and belong to user
- **Category validation**: Category must exist for budgets
- **Uniqueness**: No duplicate budget names per user (optional)

### 4.3 Transaction Listener Failures
- Debounce recalculations to avoid hammering DB
- Log listener errors without crashing app
- Fallback: manual refresh button on detail screens
- Implement retry logic with exponential backoff

### 4.4 Release Build Consistency
- All database writes use `enqueueWrite()` from write queue
- All reads use parameterized queries (prevent SQL injection)
- Graceful degradation: if listener fails, user can still manually refresh
- Comprehensive logging for debugging production issues

---

## 5. UX LAYOUTS

### 5.1 Goals Tab (Current Budget & Goals Page)

**Goals List View**:
```
[← Back]
┌─────────────────────────────────────┐
│ Goals          [+]                  │
├─────────────────────────────────────┤
│ 📍 Emergency Fund                   │
│ $2,500 / $5,000 (50%)               │
│ Due: Dec 31, 2025                   │
│ On track: +$52/month needed         │
│ [Tap to edit]                       │
├─────────────────────────────────────┤
│ 🏖️  Vacation Fund                   │
│ $800 / $2,000 (40%)                 │
│ Due: Aug 15, 2025                   │
│ At risk: Need +$120/month           │
│ [Tap to edit]                       │
└─────────────────────────────────────┘
```

**Goal Detail**:
```
[←] Emergency Fund           [⋯]
┌─────────────────────────────────────┐
│ Progress: $2,500 / $5,000           │
│ [████████░░░░░░░░░░] 50%            │
│                                     │
│ Target Date: Dec 31, 2025           │
│ Days Remaining: 356                 │
│ Monthly Required: $52               │
│ Status: ON TRACK ✓                  │
│                                     │
│ Notes: Emergency fund for car       │
│ Wallet: Checking Account            │
│                                     │
│ [Edit] [Delete]                     │
└─────────────────────────────────────┘
```

### 5.2 Budgets Tab (Current Budget & Goals Page)

**Budgets List View**:
```
[← Back]
┌─────────────────────────────────────┐
│ Budgets        [+]                  │
├─────────────────────────────────────┤
│ 🛒 Groceries                        │
│ $250 / $300 (83%)  [████████░] 83%  │
│ Remaining: $50 | Ends: Jan 31       │
│ [Tap to edit]                       │
├─────────────────────────────────────┤
│ 🎬 Entertainment                    │
│ $180 / $150 (120%) [█████████████]  │
│ OVER BUDGET: -$30                   │
│ [Tap to edit]                       │
└─────────────────────────────────────┘
```

**Budget Detail**:
```
[←] Groceries               [⋯]
┌─────────────────────────────────────┐
│ Spent: $250 / $300                  │
│ [████████░] 83%                     │
│ Remaining: $50                      │
│                                     │
│ Period: Monthly (Jan 1 - Jan 31)    │
│ Days Remaining: 15                  │
│ Daily Average: $16.67               │
│ Category: Groceries                 │
│ Wallet: Checking Account            │
│                                     │
│ Notes: Include farmers market       │
│                                     │
│ [Edit] [Delete] [View Transactions] │
└─────────────────────────────────────┘
```

### 5.3 Create Goal Modal

```
Create Goal
┌─────────────────────────────────────┐
│ Goal Name                           │
│ [Emergency Fund           ]          │
│                                     │
│ Target Amount                       │
│ [$             5000.00]             │
│                                     │
│ Target Date                         │
│ [Dec 31, 2025      ▼]               │
│                                     │
│ Wallet                              │
│ [Checking Account  ▼]               │
│                                     │
│ Notes (optional)                    │
│ [Car repairs, medical expenses]     │
│                                     │
│ [Cancel]  [Save Goal]               │
└─────────────────────────────────────┘
```

### 5.4 Create Budget Modal

```
Create Budget
┌─────────────────────────────────────┐
│ Budget Name                         │
│ [Groceries                ]          │
│                                     │
│ Category                            │
│ [Groceries         ▼]               │
│                                     │
│ Limit Amount                        │
│ [$             300.00]              │
│                                     │
│ Period                              │
│ [Monthly           ▼]               │
│                                     │
│ Wallet                              │
│ [Checking Account  ▼]               │
│                                     │
│ Notes (optional)                    │
│ [Include farmers market]            │
│                                     │
│ [Cancel]  [Save Budget]             │
└─────────────────────────────────────┘
```

---

## 6. IMPLEMENTATION CHECKLIST

### Phase 1: Database & Types
- [ ] Create `goals` table migration
- [ ] Create `budgets` table migration
- [ ] Define TypeScript types (Goal, Budget, Metrics variants)
- [ ] Export types from `src/types/`

### Phase 2: CRUD Operations
- [ ] `src/lib/db/goals.ts`: Create, read, update, delete goals
- [ ] `src/lib/db/budgets.ts`: Create, read, update, delete budgets
- [ ] All writes use `enqueueWrite()`
- [ ] All reads use parameterized queries

### Phase 3: Tracking Logic
- [ ] Implement goal progress calculation
- [ ] Implement budget spending calculation
- [ ] Implement recalculation on transaction edit/delete
- [ ] Add debouncing to prevent excessive updates

### Phase 4: UI Implementation
- [ ] Create goal creation modal
- [ ] Create goal list view
- [ ] Create goal detail screen
- [ ] Create budget creation modal
- [ ] Create budget list view
- [ ] Create budget detail screen
- [ ] Add navigation between screens

### Phase 5: Error Handling
- [ ] Validation layer for all inputs
- [ ] Error alerts on save failures
- [ ] Retry mechanisms
- [ ] Comprehensive logging

### Phase 6: Testing & Polish
- [ ] Test goal creation/edit/delete
- [ ] Test budget creation/edit/delete
- [ ] Test progress tracking on transaction changes
- [ ] Test period rollover for budgets
- [ ] Test all error cases
- [ ] Verify release build consistency

---

## 7. PROPOSED OPTIMIZATIONS

### 7.1 Performance
- **Batch updates**: When multiple transactions change, batch recalculations
- **Indexed queries**: Add indexes on `linked_wallet_id`, `category_id`, `startDate`, `endDate`
- **Lazy loading**: Load goal/budget details only when user taps
- **Caching**: Cache metric calculations with invalidation on transaction changes

### 7.2 Reliability
- **Write queue serialization**: Prevents race conditions on concurrent writes
- **Transaction history**: Maintain audit trail of goal/budget changes
- **Graceful degradation**: UI works even if listeners fail (manual refresh fallback)
- **Comprehensive logging**: Every operation logged for debugging

### 7.3 User Experience
- **Confirmation dialogs**: Warn before deleting goals/budgets
- **Empty states**: Clear messaging when no goals/budgets exist
- **Progress animations**: Visual feedback on progress bar updates
- **Actionable alerts**: "You're $30 over budget" vs just "Over budget"

---

## 8. INTEGRATION POINTS

1. **Transaction creation**: Update goal/budget metrics
2. **Transaction edit**: Recalculate metrics
3. **Transaction delete**: Recalculate metrics
4. **Wallet deletion**: Cascade delete goals/budgets
5. **Category deletion**: Set budget category to NULL (or delete budget)
6. **Settings page**: Link to Goals & Budgets management

---

## 9. FUTURE ENHANCEMENTS

- Goal templates (emergency fund, vacation, etc.)
- Budget analytics (spending trends, category insights)
- Notifications (approaching deadline, near budget limit)
- Rollover budgets (auto-create next month)
- Goal progress streaks (motivation)
- Budget forecasting (AI-powered)
- Export goal/budget reports

