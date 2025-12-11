# Goals & Budgets Feature - Complete Documentation Index

Welcome! This folder contains comprehensive documentation for the Financial Goals and Budgets feature system that has been implemented for PocketFlow.

---

## 📚 Documentation Files (Read in This Order)

### 1. **START HERE** → [GOALS_BUDGETS_SUMMARY.md](GOALS_BUDGETS_SUMMARY.md)
   - **Overview**: What has been delivered vs. what remains
   - **Architecture**: Database schema and data flow diagrams
   - **Checklist**: Integration tasks by priority
   - **Next Steps**: Recommended sequence for frontend development
   - **Time**: ~15 minutes to read

### 2. **SPECIFICATION** → [GOALS_BUDGETS_SPEC.md](GOALS_BUDGETS_SPEC.md)
   - **Requirements**: Complete feature specifications
   - **Data Structures**: Goals and Budgets interfaces
   - **Database Schema**: Table definitions with constraints
   - **Logic Flows**: Step-by-step creation and tracking flows
   - **Error Handling**: Validation and failure strategies
   - **UX Wireframes**: Layout designs for screens
   - **Implementation Checklist**: 6-phase implementation plan
   - **Optimizations**: Performance and reliability strategies
   - **Time**: ~30 minutes to read

### 3. **ARCHITECTURE & FLOWS** → [GOALS_BUDGETS_FLOWDIAGRAMS.md](GOALS_BUDGETS_FLOWDIAGRAMS.md)
   - **User Flow Diagrams**: Step-by-step flows for creation and tracking
   - **Data Relationships**: Entity relationship diagram
   - **State Management**: Component-level data flow
   - **Error Handling**: Error paths and recovery strategies
   - **Performance Optimization**: Caching, debouncing, indexing strategies
   - **Testing Scenarios**: Comprehensive test cases
   - **Time**: ~25 minutes to read (reference while building)

### 4. **IMPLEMENTATION GUIDE** → [GOALS_BUDGETS_IMPLEMENTATION_GUIDE.md](GOALS_BUDGETS_IMPLEMENTATION_GUIDE.md)
   - **What's Ready**: Complete list of available backend functions
   - **What's Pending**: UI and integration tasks
   - **Code Examples**: Patterns for creating goals/budgets
   - **Error Patterns**: How to handle errors gracefully
   - **Performance Tips**: Optimization recommendations
   - **Testing Checklist**: What to test before shipping
   - **Debugging Guide**: How to troubleshoot issues
   - **Time**: ~20 minutes (use while coding)

### 5. **TRANSACTION INTEGRATION** → [TRANSACTION_INTEGRATION_GUIDE.md](TRANSACTION_INTEGRATION_GUIDE.md)
   - **Integration Points**: Where to hook recalculation logic
   - **Code Examples**: Exactly how to trigger updates
   - **Debouncing**: Preventing excessive database queries
   - **Error Handling**: Making recalc non-blocking
   - **Wallet Integration**: Using wallet-specific queries
   - **Category Matching**: Handling category/subcategory logic
   - **Time**: ~20 minutes (critical for functionality)

---

## 🗂️ Code Files (Already Implemented)

### Backend Database Layer ✅ COMPLETE

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/db/goals.ts` | Goal CRUD, progress tracking, metrics | ✅ 100% |
| `src/lib/db/budgets.ts` | Budget CRUD, spending tracking, metrics | ✅ 100% |
| `src/lib/db/index.ts` | Database initialization (updated) | ✅ 100% |
| `src/types/goal.ts` | TypeScript types for Goals & Budgets | ✅ 100% |

### Functions Available (80+ total)

**Goals** (13 functions):
- `createGoal()` - Create new goal
- `getGoals()` - List all goals
- `getGoalById()` - Get single goal
- `getGoalWithMetrics()` - Get goal with metrics
- `updateGoal()` - Edit goal
- `deleteGoal()` - Remove goal
- `recalculateGoalProgress()` - **Update progress after transaction**
- `getGoalsByWallet()` - Goals for wallet
- `getUpcomingGoals()` - Goals with deadline in 30 days
- `getAtRiskGoals()` - Goals not on track
- `calculateGoalMetrics()` - Calculate metrics manually

**Budgets** (14 functions):
- `createBudget()` - Create new budget
- `getBudgets()` - List all budgets
- `getActiveBudgets()` - Currently active budgets
- `getBudgetById()` - Get single budget
- `getBudgetWithMetrics()` - Get budget with metrics
- `updateBudget()` - Edit budget
- `deleteBudget()` - Remove budget
- `recalculateBudgetSpending()` - **Update spending after transaction**
- `getBudgetsByWallet()` - Budgets for wallet
- `getBudgetsByCategory()` - Budgets for category
- `getOverBudgets()` - Budgets exceeding limit
- `getApproachingLimitBudgets()` - Budgets at >75%
- `calculateBudgetMetrics()` - Calculate metrics manually

---

## 🎯 Quick Start (5-Minute Overview)

### What's Done
- ✅ Database tables created with proper schema
- ✅ All CRUD operations implemented
- ✅ Automatic recalculation logic ready
- ✅ TypeScript types defined
- ✅ Complete documentation written

### What You Build Next
1. **UI Screens** - Goal/budget list, detail, create, edit screens
2. **Transaction Integration** - Hook recalculation into transaction creation/edit/delete
3. **Navigation** - Link from Settings to goal/budget management
4. **Forms** - Create/edit forms with validation
5. **Polish** - Animations, notifications, error handling

### Critical Integration Point ⚠️
The **MOST IMPORTANT** remaining task is integrating with the transaction system:

```typescript
// After creating a transaction:
if (transaction.type === 'income') {
  const goals = await getGoalsByWallet(transaction.wallet_id);
  for (const goal of goals) {
    await recalculateGoalProgress(goal.id!);
  }
}

// After creating an expense transaction:
if (transaction.type === 'expense') {
  const budgets = await getBudgetsByWallet(transaction.wallet_id);
  for (const budget of budgets) {
    if (matchesCategoryAndPeriod(budget, transaction)) {
      await recalculateBudgetSpending(budget.id!);
    }
  }
}
```

Without this integration, goals and budgets won't update automatically!

---

## 🚀 Implementation Path

### Phase 1: Basic Integration (2-3 hours)
- [ ] Read TRANSACTION_INTEGRATION_GUIDE.md
- [ ] Implement transaction hooks (create/edit/delete)
- [ ] Test goal progress updates
- [ ] Test budget spending updates

### Phase 2: UI Screens (8-10 hours)
- [ ] Goal list screen
- [ ] Goal detail screen
- [ ] Goal creation form
- [ ] Budget list screen
- [ ] Budget detail screen
- [ ] Budget creation form

### Phase 3: Navigation & Links (2-3 hours)
- [ ] Update Settings page
- [ ] Add goal/budget management links
- [ ] Create routing structure

### Phase 4: Polish & Testing (5-7 hours)
- [ ] Add form validation
- [ ] Add error handling
- [ ] Add confirmation dialogs
- [ ] Test on iOS and Android
- [ ] Test edge cases

**Total Estimated Time**: 20-30 hours

---

## 💾 Database Schema (Quick Reference)

```sql
-- Goals Table
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_progress REAL NOT NULL DEFAULT 0,  -- Updated by recalculation
  target_date TEXT NOT NULL,                 -- ISO 8601
  notes TEXT,
  linked_wallet_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- Budgets Table
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER,                       -- Expense category
  subcategory_id INTEGER,                    -- Optional subcategory
  limit_amount REAL NOT NULL,
  current_spending REAL NOT NULL DEFAULT 0,  -- Updated by recalculation
  period_type TEXT NOT NULL,                 -- 'weekly', 'monthly', 'custom'
  start_date TEXT NOT NULL,                  -- ISO 8601
  end_date TEXT NOT NULL,                    -- ISO 8601
  notes TEXT,
  linked_wallet_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY(linked_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);
```

---

## 📊 Data Flow Diagram

```
User Creates Income Transaction
    ↓
Transaction saved to database
    ↓
Find all goals linked to wallet
    ↓
For each goal:
    ├─→ Call recalculateGoalProgress(goalId)
    ├─→ Query: SUM(income) for wallet
    └─→ Update: goal.current_progress = total
    
Result: Goal progress bar updates automatically ✓


User Creates Expense Transaction
    ↓
Transaction saved to database
    ↓
Find all budgets linked to wallet
    ↓
For each budget:
    ├─→ Check if category & date match
    ├─→ If match: Call recalculateBudgetSpending(budgetId)
    ├─→ Query: SUM(spending) for category+period+wallet
    └─→ Update: budget.current_spending = total

Result: Budget progress bar updates automatically ✓
```

---

## 🔧 Common Tasks

### Create a Goal Programmatically
```typescript
import { createGoal } from '@/lib/db/goals';

const goal = await createGoal({
  name: 'Emergency Fund',
  targetAmount: 5000,
  targetDate: '2025-12-31',
  notes: 'Car repairs and medical',
  linkedWalletId: 1,
});
```

### Create a Budget Programmatically
```typescript
import { createBudget } from '@/lib/db/budgets';

const budget = await createBudget({
  name: 'Groceries',
  categoryId: 4,
  limitAmount: 300,
  periodType: 'monthly',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  linkedWalletId: 1,
});
```

### Get Goal Progress for Display
```typescript
import { getGoalWithMetrics } from '@/lib/db/goals';

const goal = await getGoalWithMetrics(goalId);

// Use goal.progressPercentage (0-100) for progress bar
// Use goal.daysRemaining to show deadline
// Use goal.onTrack to show status indicator
// Use goal.monthlyRequired to show required savings
```

### Get Budget Status for Display
```typescript
import { getBudgetWithMetrics } from '@/lib/db/budgets';

const budget = await getBudgetWithMetrics(budgetId);

// Use budget.percentageUsed (0-100) for progress bar
// Use budget.remainingBalance to show remaining
// Use budget.isOverBudget to show alert
// Use budget.averageDailySpend to show trend
```

### Trigger Recalculation After Transaction
```typescript
import { recalculateGoalProgress } from '@/lib/db/goals';
import { recalculateBudgetSpending } from '@/lib/db/budgets';

// After income transaction created:
await recalculateGoalProgress(goalId);

// After expense transaction created:
await recalculateBudgetSpending(budgetId);
```

---

## 🐛 Debugging

### Check Goal State
```typescript
const goals = await getGoals();
const metricsGoals = await Promise.all(
  goals.map(g => getGoalWithMetrics(g.id!))
);
console.log('Goals with metrics:', metricsGoals);
```

### Check Budget State
```typescript
const budgets = await getBudgets();
const activeBudgets = await getActiveBudgets();
const overBudgets = await getOverBudgets();
console.log('All budgets:', budgets);
console.log('Active budgets:', activeBudgets);
console.log('Over budget:', overBudgets);
```

### Verify Recalculation
```typescript
// Before transaction
const goalBefore = await getGoalWithMetrics(goalId);
console.log('Progress before:', goalBefore.currentProgress);

// Create transaction
await createTransaction({ ... });

// After recalculation
const goalAfter = await getGoalWithMetrics(goalId);
console.log('Progress after:', goalAfter.currentProgress);
```

---

## ✅ Validation Checklist Before Shipping

- [ ] **Goals**: Can create, read, update, delete
- [ ] **Budgets**: Can create, read, update, delete
- [ ] **Progress**: Goal progress updates after income transaction
- [ ] **Spending**: Budget spending updates after expense transaction
- [ ] **Metrics**: Progress bars show correct percentages
- [ ] **Dates**: Period boundaries work correctly
- [ ] **Categories**: Budgets only count matching categories
- [ ] **Wallets**: Each budget/goal linked to correct wallet
- [ ] **Cascades**: Deleting wallet deletes goals/budgets
- [ ] **Errors**: Validation errors shown clearly
- [ ] **iOS**: Works on iOS simulator/device
- [ ] **Android**: Works on Android emulator/device
- [ ] **Themes**: Works with light and dark themes
- [ ] **Currencies**: Works with different currency codes
- [ ] **Release Build**: Consistent behavior in release mode

---

## 📖 Document Quick Links

| Document | When to Read |
|----------|-------------|
| GOALS_BUDGETS_SUMMARY.md | **First** - Get overview |
| GOALS_BUDGETS_SPEC.md | Understanding requirements |
| GOALS_BUDGETS_FLOWDIAGRAMS.md | While designing/building |
| GOALS_BUDGETS_IMPLEMENTATION_GUIDE.md | While coding backend integration |
| TRANSACTION_INTEGRATION_GUIDE.md | **Critical** - Before coding features |

---

## 🎓 Key Concepts

### Goal
An **independent income target** for a wallet with a deadline. Progress automatically updates when income is added.

Example: "Save $5,000 for emergency fund by Dec 31, 2025"

### Budget
A **spending limit for a category** within a time period. Spending automatically updates when matching expenses are added.

Example: "Spend max $300/month on groceries"

### Recalculation
The process of automatically updating goal progress or budget spending after transaction changes. Triggered by:
- Creating a transaction
- Editing a transaction
- Deleting a transaction

### Metrics
Calculated values derived from raw progress/spending data:
- **Goals**: percentage, days remaining, monthly required, on-track status
- **Budgets**: percentage used, remaining balance, daily average, over-budget status

### Write Queue
Internal serialization mechanism that prevents database lock errors. Automatically used by all CRUD functions.

---

## 🆘 Getting Help

### If recalculation isn't working:
1. Check that transaction is being created successfully
2. Verify goal/budget is linked to correct wallet
3. Check that recalculate function is being called (add console.log)
4. Query database directly to verify data

### If metrics are wrong:
1. Verify transaction data (amount, category, type)
2. Check that transaction date is within budget period
3. Verify category ID matches budget category
4. Query database to check SUM results

### If UI doesn't update:
1. Verify recalculation function was called
2. Check that state is updated after recalculation
3. Verify component is using hook/state properly
4. Check React DevTools for state changes

---

## 📝 Summary

You now have:

✅ **Complete backend system** - All database, types, and logic ready
✅ **Comprehensive documentation** - Spec, flows, guides, examples
✅ **Clear implementation path** - Phased approach with priorities
✅ **Testing guide** - Validation checklist and debugging tools

**Next action**: Read GOALS_BUDGETS_SUMMARY.md, then TRANSACTION_INTEGRATION_GUIDE.md to understand how to connect everything together.

**Estimated time to implement**: 20-30 hours
**Difficulty level**: Medium (straightforward CRUD + integration)
**Risk level**: Low (well-documented, backend is complete)

Good luck! 🚀
