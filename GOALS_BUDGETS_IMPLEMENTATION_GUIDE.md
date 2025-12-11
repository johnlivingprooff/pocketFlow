# Financial Goals & Budgets - Implementation Guide

## Quick Start

This guide helps you implement the financial goals and budgets features that are now fully supported in the PocketFlow database layer.

### What Has Been Implemented

#### ✅ Database Layer
- `src/lib/db/goals.ts` - Complete CRUD and tracking for goals
- `src/lib/db/budgets.ts` - Complete CRUD and tracking for budgets
- Database tables with proper indexes and constraints
- Automatic progress/spending recalculation functions

#### ✅ TypeScript Types
- `src/types/goal.ts` - Goal and Budget interfaces + metrics variants

#### ✅ Core Functions Available

**Goals Functions** (`src/lib/db/goals.ts`):
```typescript
createGoal(goal: GoalInput) → Promise<Goal>
getGoals() → Promise<Goal[]>
getGoalById(id) → Promise<Goal | null>
getGoalWithMetrics(id) → Promise<GoalWithMetrics | null>
updateGoal(id, updates) → Promise<void>
deleteGoal(id) → Promise<void>
recalculateGoalProgress(goalId) → Promise<void>
getGoalsByWallet(walletId) → Promise<Goal[]>
getUpcomingGoals() → Promise<GoalWithMetrics[]>
getAtRiskGoals() → Promise<GoalWithMetrics[]>
calculateGoalMetrics(goal) → GoalWithMetrics
```

**Budgets Functions** (`src/lib/db/budgets.ts`):
```typescript
createBudget(budget: BudgetInput) → Promise<Budget>
getBudgets() → Promise<Budget[]>
getActiveBudgets() → Promise<Budget[]>
getBudgetById(id) → Promise<Budget | null>
getBudgetWithMetrics(id) → Promise<BudgetWithMetrics | null>
updateBudget(id, updates) → Promise<void>
deleteBudget(id) → Promise<void>
recalculateBudgetSpending(budgetId) → Promise<void>
getBudgetsByWallet(walletId) → Promise<Budget[]>
getBudgetsByCategory(categoryId) → Promise<Budget[]>
getOverBudgets() → Promise<BudgetWithMetrics[]>
getApproachingLimitBudgets() → Promise<BudgetWithMetrics[]>
calculateBudgetMetrics(budget) → BudgetWithMetrics
```

### What Still Needs Implementation

The following UI and integration tasks remain:

#### 1. Update Current Budget & Goals Page

**Location**: `app/budget/index.tsx`

Currently, this page shows basic budget and goal information. Enhance it to:
- Use new `getActiveBudgets()` and `getGoals()` functions
- Call `recalculateBudgetSpending()` and `recalculateGoalProgress()` after transaction changes
- Display `BudgetWithMetrics` and `GoalWithMetrics` calculated values

**Integration Points**:
```typescript
// After creating/editing a transaction:
await recalculate BudgetSpending(budgetId);
await recalculateGoalProgress(goalId);
```

#### 2. Create Goal Management Screens

**Create/Edit Goal Modal**:
- Form fields: name, targetAmount, targetDate, linkedWalletId, notes
- Validation: amount > 0, date is future, wallet exists
- Use `createGoal()` and `updateGoal()` functions
- Display error alerts on failure

**Goal Detail Screen**:
- Show goal with metrics from `getGoalWithMetrics()`
- Display: progress bar, days remaining, monthly required, on-track status
- Add: Edit, Delete, View Linked Transactions buttons
- Use `deleteGoal()` for deletion

**Goal List Screen**:
- List from `getGoals()` with metrics
- Show icons, names, progress bars
- Tap to view detail
- Add "Create Goal" button
- Show upcoming and at-risk goals separately (using `getUpcomingGoals()`, `getAtRiskGoals()`)

#### 3. Create Budget Management Screens

**Create/Edit Budget Modal**:
- Form fields: name, categoryId/subcategoryId, limitAmount, periodType, startDate, endDate, linkedWalletId, notes
- Validation: category exists, amount > 0, dates valid
- Use `createBudget()` and `updateBudget()` functions

**Budget Detail Screen**:
- Show budget with metrics from `getBudgetWithMetrics()`
- Display: spending vs limit, progress bar, remaining balance, daily average, days remaining
- Add: Edit, Delete, View Transactions buttons
- Use `deleteBudget()` for deletion

**Budget List Screen**:
- List from `getActiveBudgets()` with metrics
- Show category icons, names, spending progress
- Color-code by status: green (<75%), gold (75-99%), red (>100%)
- Tap to view detail
- Add "Create Budget" button
- Separate sections: Over Budget, Approaching Limit, On Track

#### 4. Transaction Integration

**After Creating Transaction**:
```typescript
// Find matching budgets and goals
const budgets = await getBudgetsByWallet(walletId);
for (const budget of budgets) {
  // Check if transaction matches budget category and period
  if (matchesCategory && isInPeriod) {
    await recalculateBudgetSpending(budget.id);
  }
}

// Find matching goals
const goals = await getGoalsByWallet(walletId);
for (const goal of goals) {
  if (transaction.type === 'income') {
    await recalculateGoalProgress(goal.id);
  }
}
```

**After Editing/Deleting Transaction**:
- Recalculate all affected budgets and goals
- Use same logic as creation

#### 5. Period Rollover for Budgets

**Implement Budget Rollover Logic**:
```typescript
// Call periodically (daily) or on app launch
async function handleBudgetRollover() {
  const budgets = await getBudgets();
  const today = new Date().toISOString();
  
  for (const budget of budgets) {
    if (budget.endDate < today && budget.periodType !== 'custom') {
      // Create new budget for next period
      const newStartDate = // calculate next period start
      const newEndDate = // calculate next period end
      
      await createBudget({
        ...budget,
        startDate: newStartDate,
        endDate: newEndDate,
      });
    }
  }
}
```

#### 6. Add Navigation

**Update Settings Page**:
- Add link to Goals Management page
- Add link to Budgets Management page

**Create Navigation Flow**:
```
Settings
├── Budget & Goals (existing page)
│   ├── Goals Tab
│   │   ├── View All Goals
│   │   └── Create/Edit Goal
│   └── Budgets Tab
│       ├── View All Budgets
│       └── Create/Edit Budget
├── Goals Management (new)
│   ├── List Goals
│   ├── View Goal Detail
│   ├── Create Goal
│   └── Edit Goal
└── Budgets Management (new)
    ├── List Budgets
    ├── View Budget Detail
    ├── Create Budget
    └── Edit Budget
```

### Example Implementation Pattern

Here's a template for implementing a goal creation screen:

```typescript
// app/goals/create.tsx
import { Goal, GoalInput } from '@/types/goal';
import { createGoal } from '@/lib/db/goals';
import { getWallets } from '@/lib/db/wallets';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';

export default function CreateGoalScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<GoalInput>({
    name: '',
    targetAmount: 0,
    targetDate: new Date().toISOString().split('T')[0],
    notes: '',
    linkedWalletId: 0,
  });

  const handleCreate = async () => {
    // Validation
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }
    if (form.targetAmount <= 0) {
      Alert.alert('Error', 'Target amount must be greater than 0');
      return;
    }
    if (new Date(form.targetDate) <= new Date()) {
      Alert.alert('Error', 'Target date must be in the future');
      return;
    }

    try {
      setLoading(true);
      const goal = await createGoal(form);
      Alert.alert('Success', 'Goal created!');
      router.push(`/goals/${goal.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create goal. Please try again.');
      console.error('Create goal error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render form with inputs...
}
```

### Error Handling Patterns

All functions are error-safe. Wrap them in try-catch:

```typescript
try {
  const goal = await createGoal(goalData);
  // Success
} catch (error) {
  console.error('Failed to create goal:', error);
  Alert.alert('Error', 'Could not create goal. Please try again.');
}
```

### Performance Optimization Tips

1. **Debounce Recalculations**: When transactions change rapidly, debounce calls to `recalculate*()` functions
2. **Use Wallet Queries**: When showing budgets/goals for specific wallet, use `getByWallet()` functions
3. **Cache Metrics**: Store calculated metrics in state, invalidate only when data changes
4. **Lazy Load**: Load goal/budget details only when user navigates to detail screen
5. **Batch Operations**: If recalculating multiple budgets, consider batching in a transaction

### Testing Checklist

- [ ] Create goal with valid data
- [ ] Try to create goal with invalid data (catch all validation errors)
- [ ] Edit goal (name, target amount, date, notes)
- [ ] Delete goal
- [ ] Create budget with category
- [ ] Create budget with subcategory
- [ ] Edit budget
- [ ] Delete budget
- [ ] Verify goal progress updates when income transaction added
- [ ] Verify budget spending updates when expense transaction added
- [ ] Test budget period rollover
- [ ] Test with different currencies
- [ ] Test on both Android and iOS

### Debugging

**Check Database State**:
```typescript
const allGoals = await getGoals();
const allBudgets = await getBudgets();
console.log('Goals:', allGoals);
console.log('Budgets:', allBudgets);
```

**Verify Metrics Calculation**:
```typescript
const goal = await getGoalWithMetrics(goalId);
console.log('Progress:', goal.progressPercentage + '%');
console.log('On track:', goal.onTrack);
```

**Check Transaction Integration**:
```typescript
// After transaction change, verify recalculation
const budget = await getBudgetWithMetrics(budgetId);
console.log('Current spending:', budget.currentSpending);
console.log('Percentage used:', budget.percentageUsed + '%');
```

## Summary

You now have a complete backend system for Goals and Budgets. The next steps are to:
1. Implement UI screens for creating/managing goals and budgets
2. Integrate transaction changes to trigger recalculations
3. Add navigation and links to the Settings page
4. Implement period rollover for budgets
5. Add error handling and user feedback

All database operations are safe, use the write queue, and handle concurrent access properly. Focus on building a great UX around these powerful backend functions!
