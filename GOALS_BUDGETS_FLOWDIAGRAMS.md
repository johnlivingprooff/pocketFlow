# Financial Goals & Budgets - Architecture & Flow Diagrams

## 1. User Flow Diagrams

### 1.1 Goal Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   GOAL CREATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

USER NAVIGATION
│
├─→ Settings Page
│   └─→ "Goals & Budgets" Link
│       └─→ Goals Tab
│           └─→ [+] Create Goal Button
│
GOAL CREATION FORM
│
├─→ Enter Goal Name
│   └─→ "Emergency Fund"
│
├─→ Enter Target Amount
│   └─→ "$5,000"
│
├─→ Select Target Date
│   └─→ "December 31, 2025"
│
├─→ Select Linked Wallet
│   └─→ "Checking Account"
│
├─→ Enter Notes (Optional)
│   └─→ "Car repairs, medical emergency fund"
│
VALIDATION
│
├─→ ✓ Name is not empty?
│   └─→ YES → Continue
│       NO → Show error
│
├─→ ✓ Amount > 0?
│   └─→ YES → Continue
│       NO → Show error
│
├─→ ✓ Date is in future?
│   └─→ YES → Continue
│       NO → Show error
│
├─→ ✓ Wallet exists?
│   └─→ YES → Continue
│       NO → Show error
│
SAVE OPERATION
│
├─→ Call createGoal(goalInput)
│   └─→ Transaction [Write Queue Protected]
│       ├─→ Generate ID
│       ├─→ Set currentProgress = 0
│       ├─→ Set timestamps (createdAt, updatedAt)
│       └─→ INSERT into goals table
│
SUCCESS
│
├─→ Show success alert
├─→ Navigate to Goal Detail Screen
└─→ Display goal with 0% progress

ERROR PATHS
│
├─→ Validation Error
│   └─→ Display validation message
│       └─→ Stay on form
│
├─→ Database Error
│   └─→ Display "Failed to create goal. Try again."
│       └─→ Stay on form
│
└─→ Network/Storage Error
    └─→ Display "Storage error. Restart app."
        └─→ Log error for debugging
```

### 1.2 Budget Creation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  BUDGET CREATION FLOW                        │
└──────────────────────────────────────────────────────────────┘

USER NAVIGATION
│
├─→ Settings Page
│   └─→ "Goals & Budgets" Link
│       └─→ Budgets Tab
│           └─→ [+] Create Budget Button
│
BUDGET CREATION FORM
│
├─→ Enter Budget Name
│   └─→ "Grocery Shopping"
│
├─→ Select Category
│   └─→ "Groceries" (with parent/child support)
│
├─→ Enter Limit Amount
│   └─→ "$300"
│
├─→ Select Period Type
│   ├─→ Weekly
│   │   └─→ Set dates: Mon-Sun of current week
│   │
│   ├─→ Monthly
│   │   └─→ Set dates: 1st-last of current month
│   │
│   └─→ Custom
│       ├─→ Select Start Date
│       └─→ Select End Date
│
├─→ Select Linked Wallet
│   └─→ "Checking Account"
│
├─→ Enter Notes (Optional)
│   └─→ "Include farmers market, exclude dining"
│
VALIDATION
│
├─→ ✓ Name is not empty?
│   └─→ YES → Continue
│
├─→ ✓ Category selected & exists?
│   └─→ YES → Continue
│       NO → Show error
│
├─→ ✓ Amount > 0?
│   └─→ YES → Continue
│
├─→ ✓ Dates valid?
│   └─→ startDate < endDate?
│       └─→ YES → Continue
│           NO → Show error
│
├─→ ✓ Wallet exists?
│   └─→ YES → Continue
│       NO → Show error
│
SPENDING CALCULATION
│
├─→ Query existing transactions:
│   WHERE:
│   ├─→ type = 'expense'
│   ├─→ category = selectedCategory
│   ├─→ wallet_id = linkedWallet
│   ├─→ date BETWEEN startDate AND endDate
│   └─→ category != 'Transfer'
│
└─→ SUM(amount) = initialSpending

SAVE OPERATION
│
├─→ Call createBudget(budgetInput)
│   └─→ Transaction [Write Queue Protected]
│       ├─→ Generate ID
│       ├─→ Set currentSpending = initialSpending
│       ├─→ Set timestamps (createdAt, updatedAt)
│       └─→ INSERT into budgets table
│
SUCCESS
│
├─→ Show success alert
├─→ Navigate to Budget Detail Screen
└─→ Display budget with calculated metrics

ERROR PATHS
│
├─→ Validation Error
│   └─→ Display specific error message
│       └─→ Stay on form
│
├─→ Spending Calculation Error
│   └─→ Set currentSpending = 0
│       └─→ Log error, continue
│
└─→ Database Error
    └─→ Display "Failed to create budget. Try again."
```

### 1.3 Goal Progress Tracking Flow

```
┌──────────────────────────────────────────────────────────────┐
│              GOAL PROGRESS UPDATE FLOW                       │
└──────────────────────────────────────────────────────────────┘

TRIGGER: Transaction Created
│
├─→ Check: transaction.type == 'income'?
│   └─→ NO → Stop, not an income transaction
│       YES → Continue
│
├─→ Check: transaction.wallet_id matches any goal.linked_wallet_id?
│   └─→ NO → Stop, wallet not linked to goal
│       YES → Continue (may match multiple goals)
│
FOR EACH MATCHING GOAL:
│
├─→ Call recalculateGoalProgress(goalId)
│   │
│   └─→ Query: SUM(amount) of all income transactions
│       WHERE:
│       ├─→ wallet_id = goal.linkedWalletId
│       ├─→ type = 'income'
│       └─→ category != 'Transfer'
│   │
│   └─→ [Write Queue Protected] UPDATE goal.currentProgress
│
├─→ Call calculateGoalMetrics(goal)
│   │
│   ├─→ progressPercentage = (currentProgress / targetAmount) * 100
│   ├─→ daysRemaining = days until targetDate
│   ├─→ monthlyRequired = remainingAmount / monthsRemaining
│   └─→ onTrack = remainingAmount <= monthlyRequired * monthsRemaining
│
└─→ UI REFRESH
    │
    ├─→ Update Goal Detail screen
    │   ├─→ Show new progress bar
    │   ├─→ Update metrics display
    │   ├─→ Show on-track/at-risk indicator
    │   └─→ Show monthly required amount
    │
    └─→ Update Goals List
        └─→ Refresh progress bars

TRIGGER: Transaction Edited
│
└─→ Same as "Transaction Created" (full recalculation)
    (Ensures consistency even if edit changes amount or category)

TRIGGER: Transaction Deleted
│
└─→ Same as "Transaction Created"
    (Recalculation accounts for removal from total)
```

### 1.4 Budget Spending Tracking Flow

```
┌──────────────────────────────────────────────────────────────┐
│            BUDGET SPENDING UPDATE FLOW                       │
└──────────────────────────────────────────────────────────────┘

TRIGGER: Transaction Created
│
├─→ Check: transaction.type == 'expense'?
│   └─→ NO → Stop, not an expense transaction
│       YES → Continue
│
├─→ Get all budgets for transaction.wallet_id
│
FOR EACH BUDGET:
│
├─→ Check: Budget category matches transaction category?
│   │
│   └─→ Match by categoryId OR subcategoryId?
│       └─→ NO → Skip this budget
│           YES → Continue
│
├─→ Check: Transaction date in [budget.startDate, budget.endDate]?
│   └─→ NO → Skip this budget
│       YES → Continue
│
├─→ Check: category != 'Transfer'?
│   └─→ NO → Skip (transfers don't count as spending)
│       YES → Continue
│
SPENDING CALCULATION
│
├─→ Call recalculateBudgetSpending(budgetId)
│   │
│   └─→ Query: SUM(amount) of matching expense transactions
│       WHERE:
│       ├─→ wallet_id = budget.linkedWalletId
│       ├─→ type = 'expense'
│       ├─→ date BETWEEN budget.startDate AND budget.endDate
│       ├─→ category = selectedCategory (or subcategory)
│       └─→ category != 'Transfer'
│   │
│   └─→ [Write Queue Protected] UPDATE budget.currentSpending
│
METRICS CALCULATION
│
├─→ Call calculateBudgetMetrics(budget)
│   │
│   ├─→ remainingBalance = limitAmount - currentSpending
│   ├─→ percentageUsed = (currentSpending / limitAmount) * 100
│   ├─→ isOverBudget = currentSpending > limitAmount
│   ├─→ daysRemaining = days until endDate
│   └─→ averageDailySpend = currentSpending / daysElapsed
│
STATUS DETERMINATION
│
├─→ If isOverBudget?
│   └─→ STATUS = "OVER_BUDGET" (Red)
│       └─→ Show remaining as negative amount
│
├─→ Else if percentageUsed >= 75%?
│   └─→ STATUS = "APPROACHING_LIMIT" (Gold)
│       └─→ Show warning
│
└─→ Else
    └─→ STATUS = "ON_TRACK" (Green)
        └─→ Show remaining balance

UI NOTIFICATIONS
│
├─→ If isOverBudget:
│   └─→ Show alert: "You're ${amount} over budget for ${category}"
│
├─→ Else if percentageUsed >= 90%:
│   └─→ Show toast: "Budget almost full: ${remaining} remaining"
│
└─→ Update Budget List with new metrics

TRIGGER: Transaction Edited or Deleted
│
└─→ Same as "Transaction Created"
    (Full recalculation ensures accuracy)
```

### 1.5 Budget Period Rollover Flow

```
┌──────────────────────────────────────────────────────────────┐
│              BUDGET PERIOD ROLLOVER                          │
└──────────────────────────────────────────────────────────────┘

TRIGGER: Daily or on App Launch
│
├─→ Call handleBudgetRollover()
│
GET ALL BUDGETS
│
├─→ budgets = await getBudgets()
│
FOR EACH BUDGET:
│
├─→ Check: budget.endDate < today AND periodType != 'custom'?
│   └─→ NO → Skip (still active or custom period)
│       YES → Continue
│
CALCULATE NEXT PERIOD
│
├─→ If periodType == 'weekly':
│   │
│   └─→ nextStartDate = endDate + 1 day
│       nextEndDate = nextStartDate + 6 days
│
├─→ Else if periodType == 'monthly':
│   │
│   └─→ nextStartDate = first day of next month
│       nextEndDate = last day of next month
│
└─→ Else:
    └─→ Skip (custom periods don't auto-rollover)

CREATE NEW BUDGET
│
├─→ Call createBudget({
│   │   ...previousBudget,
│   │   startDate: nextStartDate,
│   │   endDate: nextEndDate,
│   │   currentSpending: 0
│   │ })
│   │
│   └─→ New budget created for next period
│
ARCHIVE OLD BUDGET (Optional)
│
├─→ Mark or move previous budget to history
└─→ User can view past budgets and spending trends

METRICS FOR NEW PERIOD
│
├─→ New budget starts with fresh spending calculation
└─→ Only transactions in next period count toward limit
```

---

## 2. Data Relationship Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   DATA RELATIONSHIPS                         │
└──────────────────────────────────────────────────────────────┘

WALLETS (existing)
│
├─→ id (PK)
├─→ name
├─→ currency
├─→ initial_balance
└─→ ... other fields


GOALS (new)
│
├─→ id (PK)
├─→ name
├─→ target_amount
├─→ current_progress        ◄─── Updated by income transactions
├─→ target_date             ◄─── Used for deadline & metrics
├─→ notes
├─→ linked_wallet_id (FK) ──────┐
├─→ created_at                   │
└─→ updated_at                   │
                                 │
                                 │ ONE-TO-MANY
                                 │ (Goal linked to 1 Wallet)
                                 │
                            Wallet ◄─┘
                                 │
                                 │
TRANSACTIONS (existing)           │
│                                │
├─→ id (PK)                      │
├─→ wallet_id (FK) ─────────────┼────┐
├─→ type (income/expense)        │    │
├─→ amount                       │    │
├─→ category                     │    │
├─→ date                         │    │
├─→ notes                        │    │
├─→ created_at                   │    │
└─→ ... other fields             │    │
                                 │    │
                                 │    │
BUDGETS (new)                    │    │
│                                │    │
├─→ id (PK)                      │    │
├─→ name                         │    │
├─→ category_id (FK)             │    │
├─→ subcategory_id (FK)          │    │
├─→ limit_amount                 │    │
├─→ current_spending    ◄────────────┘ Updated by expense
├─→ period_type                        transactions
├─→ start_date
├─→ end_date
├─→ notes
├─→ linked_wallet_id (FK) ──────┐
├─→ created_at                   │ ONE-TO-MANY
└─→ updated_at                   │ (Budget linked to 1 Wallet)
                                 │
                            Wallet ◄─┘


CATEGORIES (existing, now with hierarchy)
│
├─→ id (PK)
├─→ name
├─→ type (income/expense)
├─→ icon
├─→ color
├─→ is_preset
├─→ parent_category_id (FK) ◄─── Hierarchy support
├─→ created_at
└─→ ... other fields
    │
    └─→ Referenced by Budgets.category_id
```

---

## 3. State & Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│              APPLICATION STATE FLOW                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   GOALS STATE    │
└──────────────────┘
│
├─→ goalsList: Goal[]
│   └─→ Retrieved from: getGoals()
│
├─→ goalsWithMetrics: GoalWithMetrics[]
│   └─→ Calculated from: calculateGoalMetrics()
│
├─→ selectedGoal: Goal | null
│   └─→ Displayed on: Goal Detail screen
│
├─→ upcomingGoals: GoalWithMetrics[]
│   └─→ From: getUpcomingGoals() (within 30 days)
│
└─→ atRiskGoals: GoalWithMetrics[]
    └─→ From: getAtRiskGoals() (not on track)


┌──────────────────┐
│  BUDGETS STATE   │
└──────────────────┘
│
├─→ budgetsList: Budget[]
│   └─→ Retrieved from: getBudgets()
│
├─→ activeBudgets: BudgetWithMetrics[]
│   └─→ Filtered from: getActiveBudgets()
│
├─→ selectedBudget: Budget | null
│   └─→ Displayed on: Budget Detail screen
│
├─→ overBudgets: BudgetWithMetrics[]
│   └─→ From: getOverBudgets() (spending > limit)
│
└─→ approachingBudgets: BudgetWithMetrics[]
    └─→ From: getApproachingLimitBudgets() (>75% used)


┌─────────────────────────┐
│ TRANSACTION LISTENERS   │
└─────────────────────────┘
│
├─→ On transaction created:
│   │
│   ├─→ Find matching goals
│   ├─→ Find matching budgets
│   ├─→ Trigger recalculations
│   └─→ Update state
│
├─→ On transaction edited:
│   │
│   ├─→ Recalculate affected goals/budgets
│   └─→ Update state
│
└─→ On transaction deleted:
    │
    ├─→ Recalculate affected goals/budgets
    └─→ Update state


┌──────────────────────────────────┐
│ DEBOUNCED RECALCULATIONS         │
│ (Prevent excessive DB queries)   │
└──────────────────────────────────┘
│
├─→ Debounce delay: 500ms
│
├─→ Batch multiple recalculations
│   └─→ If 3 transactions created quickly,
│       only recalculate once after 500ms
│
└─→ Reduces database load
    └─→ Improves UI responsiveness
```

---

## 4. Error Handling Diagram

```
┌──────────────────────────────────────────────────────────────┐
│              ERROR HANDLING FLOW                             │
└──────────────────────────────────────────────────────────────┘

VALIDATION ERRORS
│
├─→ Empty name → "Please enter a name"
├─→ Invalid amount → "Amount must be greater than 0"
├─→ Invalid date → "Date must be in the future" / "Start date must be before end date"
├─→ Missing category → "Please select a category"
├─→ Missing wallet → "Please select a wallet"
└─→ Display in: Alert.alert()

DATABASE ERRORS
│
├─→ SQLITE_BUSY (database locked)
│   └─→ Write queue handles with automatic retry + exponential backoff
│
├─→ Constraint violation
│   └─→ "Cannot save: invalid data"
│   └─→ Log full error for debugging
│
└─→ Connection error
    └─→ "Failed to connect to database. Restart app."

CALCULATION ERRORS
│
├─→ Spending calculation fails
│   └─→ Set to 0, log error, continue
│   └─→ User sees "Unable to calculate spending (showing 0)"
│
├─→ Metrics calculation fails
│   └─→ Use default/fallback values
│   └─→ Log error for debugging
│
└─→ Progress update fails
    └─→ Retry on next transaction change
    └─→ Provide manual refresh button

USER FEEDBACK
│
├─→ Success alert
│   └─→ "Goal created successfully!"
│
├─→ Error alert
│   └─→ User-friendly message
│   └─→ Actionable next step
│
├─→ Loading state
│   └─→ Show spinner during save
│
└─→ Empty states
    └─→ "No goals yet. Create one to get started!"
```

---

## 5. Performance Optimization Strategies

```
┌──────────────────────────────────────────────────────────────┐
│            PERFORMANCE OPTIMIZATIONS                         │
└──────────────────────────────────────────────────────────────┘

DATABASE OPTIMIZATION
│
├─→ Indexes on:
│   ├─→ goals.linked_wallet_id
│   ├─→ goals.target_date
│   ├─→ budgets.linked_wallet_id
│   ├─→ budgets.category_id
│   ├─→ budgets.start_date, budgets.end_date
│   └─→ transactions.wallet_id, transactions.type, transactions.date
│
├─→ Parameterized queries (prevent SQL injection)
│   └─→ All WHERE clauses use ? placeholders
│
└─→ Efficient aggregations
    └─→ Use SUM(), GROUP BY in database
    └─→ Don't fetch all records and sum in JS

CACHING STRATEGY
│
├─→ Cache goal/budget metrics in component state
│   └─→ Invalidate on:
│       ├─→ Transaction created/edited/deleted
│       ├─→ Goal/budget updated
│       └─→ Period rollover
│
├─→ Lazy load details
│   └─→ Load goal/budget lists quickly
│   └─→ Load detail screens on demand
│
└─→ Memoize calculated values
    └─→ Use useMemo for metrics calculations

DEBOUNCING & BATCHING
│
├─→ Debounce recalculations (500ms)
│   └─→ Prevents 10 updates from triggering 10 queries
│
├─→ Batch multiple recalculations
│   └─→ Update all affected goals/budgets in single operation
│
└─→ Batch transaction listeners
    └─→ Wait for all mutations to settle
    └─→ Then recalculate once

WRITE QUEUE OPTIMIZATION
│
├─→ All writes already serialized
│   └─→ Prevents SQLITE_BUSY errors
│
├─→ WAL mode enabled
│   └─→ Reduces lock contention
│
└─→ Exponential backoff on retries
    └─→ Automatic retry on transient failures

UI OPTIMIZATION
│
├─→ Use FlatList for goal/budget lists
│   └─→ Virtualization for long lists
│
├─→ Avoid re-renders on every metric change
│   └─→ Update state once per batch
│   └─→ Use shallow equality checks
│
├─→ Loading states
│   └─→ Show spinner, not blank screen
│   └─→ Keep previous data visible during reload
│
└─→ Error recovery
    └─→ Show retry button on failure
    └─→ Keep data even if save fails
```

---

## 6. Testing Scenarios

```
┌──────────────────────────────────────────────────────────────┐
│              TESTING SCENARIOS                               │
└──────────────────────────────────────────────────────────────┘

GOAL TESTS
│
├─→ Create goal with valid data ✓
├─→ Prevent goal with invalid amount ✓
├─→ Prevent goal with past date ✓
├─→ Update goal target amount ✓
├─→ Delete goal and cascade ✓
├─→ Goal progress updates on income transaction ✓
├─→ Goal progress recalculates on transaction edit ✓
├─→ Goal progress recalculates on transaction delete ✓
├─→ Switch wallet and reset progress ✓
├─→ Calculate metrics correctly (% complete, days remaining, on-track) ✓
└─→ Handle duplicate goals (should be allowed) ✓

BUDGET TESTS
│
├─→ Create budget with valid data ✓
├─→ Prevent budget with invalid amount ✓
├─→ Prevent budget with invalid date range ✓
├─→ Budget spending updates on expense transaction ✓
├─→ Budget spending recalculates on transaction edit ✓
├─→ Budget spending recalculates on transaction delete ✓
├─→ Budget only counts transactions in period ✓
├─→ Budget only counts matching category ✓
├─→ Budget only counts matching wallet ✓
├─→ Budget excludes transfer transactions ✓
├─→ Calculate metrics correctly (% used, remaining, daily avg) ✓
├─→ Detect over-budget status ✓
├─→ Auto-rollover monthly budgets ✓
├─→ Create new budget on rollover ✓
└─→ Switch wallet and reset spending ✓

ERROR HANDLING TESTS
│
├─→ Handle database connection errors ✓
├─→ Handle SQLITE_BUSY with automatic retry ✓
├─→ Handle validation errors gracefully ✓
├─→ Handle spending calculation errors ✓
├─→ Provide user-friendly error messages ✓
├─→ Allow retry on failed operations ✓
└─→ Log errors for debugging ✓

EDGE CASES
│
├─→ Goal with targetAmount = 0.01 (very small) ✓
├─→ Budget with limitAmount = very large number ✓
├─→ Transaction with very large amount ✓
├─→ Deleted wallet cascades to goals/budgets ✓
├─→ Deleted category sets budget to NULL (no filtering) ✓
├─→ Multiple goals linked to same wallet ✓
├─→ Multiple budgets for same category but different periods ✓
├─→ Concurrent goal/budget creation ✓
├─→ Period boundary (transaction on exact start/end date) ✓
└─→ Timezone handling for dates ✓

PERFORMANCE TESTS
│
├─→ Load 100 goals under 500ms ✓
├─→ Load 100 budgets under 500ms ✓
├─→ Create transaction, update 10 goals/budgets under 1s ✓
├─→ Debouncing prevents excessive queries ✓
├─→ Indexes effective for large datasets ✓
└─→ No memory leaks on transaction listeners ✓

COMPATIBILITY TESTS
│
├─→ Works on iOS ✓
├─→ Works on Android ✓
├─→ Works with light theme ✓
├─→ Works with dark theme ✓
├─→ Works with different currencies ✓
├─→ Works with offline database ✓
└─→ Release build consistent with debug build ✓
```

---

## 7. Summary

This comprehensive specification provides:

1. **User Flow Diagrams** - Step-by-step flows for creating/managing goals and budgets
2. **Data Relationships** - How goals, budgets, wallets, transactions, and categories relate
3. **State Management** - Component-level data flow and updates
4. **Error Handling** - Strategies for validation, database, and calculation errors
5. **Performance** - Optimizations for speed and reliability
6. **Testing** - Comprehensive test scenarios and edge cases

The implementation is designed to be:
- **Reliable**: Write queue prevents database lock errors, comprehensive error handling
- **Fast**: Indexed queries, caching, debouncing, lazy loading
- **User-friendly**: Clear error messages, loading states, confirmation dialogs
- **Maintainable**: TypeScript strict mode, well-documented, consistent patterns
- **Testable**: Clear interfaces, isolated functions, comprehensive test scenarios

All database code is already implemented. The remaining work is UI screens and integration into the transaction layer.
