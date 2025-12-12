# Transaction Integration Guide for Goals & Budgets

This guide shows how to integrate the newly created Goals and Budgets system with the existing transaction layer.

---

## Overview

When transactions are created, edited, or deleted, the system needs to:
1. Find all goals linked to the affected wallet
2. Find all budgets linked to the affected wallet and category
3. Call recalculation functions to update progress/spending
4. Debounce rapid updates to prevent excessive database queries

---

## Integration Points

### 1. After Creating a Transaction

**Location**: Wherever `createTransaction()` is called (likely in `app/transactions/add.tsx`)

```typescript
import { createTransaction } from '@/lib/db/transactions';
import { recalculateGoalProgress } from '@/lib/db/goals';
import { recalculateBudgetSpending } from '@/lib/db/budgets';
import { getGoalsByWallet, getGoalsByWallet } from '@/lib/db/goals';
import { getBudgetsByWallet } from '@/lib/db/budgets';

async function handleTransactionCreation(transactionData: TransactionInput) {
  try {
    // 1. Create the transaction
    const transaction = await createTransaction(transactionData);
    
    // 2. Update goals if income transaction
    if (transaction.type === 'income') {
      const goals = await getGoalsByWallet(transaction.wallet_id);
      for (const goal of goals) {
        if (goal.id) {
          await recalculateGoalProgress(goal.id);
        }
      }
    }
    
    // 3. Update budgets if expense transaction
    if (transaction.type === 'expense') {
      const budgets = await getBudgetsByWallet(transaction.wallet_id);
      const today = new Date().toISOString();
      
      for (const budget of budgets) {
        // Check if transaction is in budget's period and matches category
        if (
          budget.id &&
          budget.startDate <= today &&
          budget.endDate >= today &&
          (budget.categoryId === transaction.categoryId || 
           budget.subcategoryId === transaction.categoryId)
        ) {
          await recalculateBudgetSpending(budget.id);
        }
      }
    }
    
    // 4. Success feedback
    Alert.alert('Success', 'Transaction created');
    
  } catch (error) {
    console.error('Transaction creation failed:', error);
    Alert.alert('Error', 'Failed to create transaction');
  }
}
```

### 2. After Editing a Transaction

**Location**: Wherever `updateTransaction()` is called (likely in `app/transactions/edit.tsx`)

```typescript
import { updateTransaction } from '@/lib/db/transactions';
import { getTransactionById } from '@/lib/db/transactions';
import { getGoalsByWallet } from '@/lib/db/goals';
import { getBudgetsByWallet } from '@/lib/db/budgets';
import { recalculateGoalProgress, recalculateBudgetSpending } from '@/lib/db';

async function handleTransactionEdit(
  transactionId: number,
  updates: Partial<TransactionInput>
) {
  try {
    // 1. Get old transaction (before update)
    const oldTransaction = await getTransactionById(transactionId);
    if (!oldTransaction) throw new Error('Transaction not found');
    
    // 2. Update the transaction
    await updateTransaction(transactionId, updates);
    
    // 3. Get updated transaction
    const newTransaction = await getTransactionById(transactionId);
    if (!newTransaction) throw new Error('Update failed');
    
    // 4. Determine what changed
    const walletChanged = oldTransaction.wallet_id !== newTransaction.wallet_id;
    const typeChanged = oldTransaction.type !== newTransaction.type;
    const categoryChanged = oldTransaction.categoryId !== newTransaction.categoryId;
    const amountChanged = oldTransaction.amount !== newTransaction.amount;
    const dateChanged = oldTransaction.date !== newTransaction.date;
    
    // 5. Recalculate affected goals
    if (walletChanged || typeChanged || amountChanged) {
      // Recalculate for old wallet (if wallet changed)
      if (walletChanged && oldTransaction.type === 'income') {
        const oldGoals = await getGoalsByWallet(oldTransaction.wallet_id);
        for (const goal of oldGoals) {
          if (goal.id) await recalculateGoalProgress(goal.id);
        }
      }
      
      // Recalculate for new wallet
      if (newTransaction.type === 'income') {
        const newGoals = await getGoalsByWallet(newTransaction.wallet_id);
        for (const goal of newGoals) {
          if (goal.id) await recalculateGoalProgress(goal.id);
        }
      }
    }
    
    // 6. Recalculate affected budgets
    if (walletChanged || typeChanged || categoryChanged || amountChanged || dateChanged) {
      // Recalculate for old wallet (if wallet changed)
      if (walletChanged && oldTransaction.type === 'expense') {
        const oldBudgets = await getBudgetsByWallet(oldTransaction.wallet_id);
        for (const budget of oldBudgets) {
          if (budget.id) await recalculateBudgetSpending(budget.id);
        }
      }
      
      // Recalculate for new wallet
      if (newTransaction.type === 'expense') {
        const newBudgets = await getBudgetsByWallet(newTransaction.wallet_id);
        for (const budget of newBudgets) {
          if (budget.id) await recalculateBudgetSpending(budget.id);
        }
      }
    }
    
    Alert.alert('Success', 'Transaction updated');
    
  } catch (error) {
    console.error('Transaction edit failed:', error);
    Alert.alert('Error', 'Failed to update transaction');
  }
}
```

### 3. After Deleting a Transaction

**Location**: Wherever `deleteTransaction()` is called

```typescript
import { deleteTransaction, getTransactionById } from '@/lib/db/transactions';
import { getGoalsByWallet } from '@/lib/db/goals';
import { getBudgetsByWallet } from '@/lib/db/budgets';
import { recalculateGoalProgress, recalculateBudgetSpending } from '@/lib/db';

async function handleTransactionDeletion(transactionId: number) {
  try {
    // 1. Get transaction before deletion
    const transaction = await getTransactionById(transactionId);
    if (!transaction) throw new Error('Transaction not found');
    
    // 2. Delete the transaction
    await deleteTransaction(transactionId);
    
    // 3. Recalculate affected goals
    if (transaction.type === 'income') {
      const goals = await getGoalsByWallet(transaction.wallet_id);
      for (const goal of goals) {
        if (goal.id) await recalculateGoalProgress(goal.id);
      }
    }
    
    // 4. Recalculate affected budgets
    if (transaction.type === 'expense') {
      const budgets = await getBudgetsByWallet(transaction.wallet_id);
      for (const budget of budgets) {
        if (budget.id) await recalculateBudgetSpending(budget.id);
      }
    }
    
    Alert.alert('Success', 'Transaction deleted');
    
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    Alert.alert('Error', 'Failed to delete transaction');
  }
}
```

---

## Debouncing Recalculations

When multiple transactions are created/edited/deleted in quick succession, debouncing prevents excessive database queries.

### Implementation with Custom Hook

**File**: `src/lib/hooks/useRecalculateGoalsAndBudgets.ts`

```typescript
import { useCallback, useRef } from 'react';
import { getGoalsByWallet, recalculateGoalProgress } from '@/lib/db/goals';
import { getBudgetsByWallet, recalculateBudgetSpending } from '@/lib/db/budgets';

/**
 * Hook that debounces goal and budget recalculations
 * Prevents excessive queries when multiple transactions change rapidly
 */
export function useRecalculateGoalsAndBudgets() {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<{
    goalWalletIds: Set<number>;
    budgetWalletIds: Set<number>;
  }>({ goalWalletIds: new Set(), budgetWalletIds: new Set() });

  const scheduleRecalculation = useCallback(
    (walletId: number, type: 'income' | 'expense') => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Add to pending updates
      if (type === 'income') {
        pendingUpdatesRef.current.goalWalletIds.add(walletId);
      } else {
        pendingUpdatesRef.current.budgetWalletIds.add(walletId);
      }

      // Schedule recalculation after 500ms
      debounceTimerRef.current = setTimeout(async () => {
        try {
          // Recalculate all pending goals
          for (const gWalletId of pendingUpdatesRef.current.goalWalletIds) {
            const goals = await getGoalsByWallet(gWalletId);
            for (const goal of goals) {
              if (goal.id) {
                await recalculateGoalProgress(goal.id);
              }
            }
          }

          // Recalculate all pending budgets
          for (const bWalletId of pendingUpdatesRef.current.budgetWalletIds) {
            const budgets = await getBudgetsByWallet(bWalletId);
            for (const budget of budgets) {
              if (budget.id) {
                await recalculateBudgetSpending(budget.id);
              }
            }
          }

          // Reset pending updates
          pendingUpdatesRef.current = {
            goalWalletIds: new Set(),
            budgetWalletIds: new Set(),
          };
        } catch (error) {
          console.error('Recalculation failed:', error);
        }
      }, 500); // 500ms debounce delay
    },
    []
  );

  return { scheduleRecalculation };
}
```

### Using the Hook

```typescript
import { useRecalculateGoalsAndBudgets } from '@/lib/hooks/useRecalculateGoalsAndBudgets';

export function TransactionScreen() {
  const { scheduleRecalculation } = useRecalculateGoalsAndBudgets();

  const handleCreateTransaction = async (transaction: TransactionInput) => {
    try {
      await createTransaction(transaction);
      
      // Instead of immediate recalculation, schedule debounced update
      scheduleRecalculation(transaction.wallet_id, transaction.type);
      
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  };

  // ... rest of component
}
```

---

## Integration in Transaction List Component

If you have a screen that shows transaction history and allows rapid operations:

```typescript
import { FlatList, Alert } from 'react-native';
import { useRecalculateGoalsAndBudgets } from '@/lib/hooks/useRecalculateGoalsAndBudgets';
import { deleteTransaction } from '@/lib/db/transactions';

export function TransactionListScreen() {
  const { scheduleRecalculation } = useRecalculateGoalsAndBudgets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const handleDeleteTransaction = async (transaction: Transaction) => {
    Alert.alert(
      'Delete Transaction?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id!);
              
              // Schedule recalculation (debounced)
              scheduleRecalculation(transaction.wallet_id, transaction.type);
              
              // Update UI
              setTransactions(trans => trans.filter(t => t.id !== transaction.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  return (
    <FlatList
      data={transactions}
      renderItem={({ item }) => (
        <TransactionItem
          transaction={item}
          onDelete={() => handleDeleteTransaction(item)}
        />
      )}
      keyExtractor={item => item.id!.toString()}
    />
  );
}
```

---

## Integration in Wallet Detail Screen

When viewing transactions in a specific wallet:

```typescript
import { useRecalculateGoalsAndBudgets } from '@/lib/hooks/useRecalculateGoalsAndBudgets';
import { getWalletById } from '@/lib/db/wallets';
import { getTransactionsByWallet } from '@/lib/db/transactions';

export function WalletDetailScreen({ walletId }: { walletId: number }) {
  const { scheduleRecalculation } = useRecalculateGoalsAndBudgets();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadWallet();
    loadTransactions();
  }, [walletId]);

  const loadWallet = async () => {
    const w = await getWalletById(walletId);
    setWallet(w);
  };

  const loadTransactions = async () => {
    const txns = await getTransactionsByWallet(walletId);
    setTransactions(txns);
  };

  const handleAddTransaction = async (transaction: TransactionInput) => {
    try {
      await createTransaction(transaction);
      
      // Reload transactions
      await loadTransactions();
      
      // Schedule goal/budget recalculation
      scheduleRecalculation(walletId, transaction.type);
      
      Alert.alert('Success', 'Transaction added');
    } catch (error) {
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  // ... render wallet with transaction list
}
```

---

## Error Handling During Recalculation

Recalculation should not fail the transaction operation:

```typescript
async function handleTransactionCreation(transactionData: TransactionInput) {
  try {
    // 1. Create transaction (critical - must succeed)
    const transaction = await createTransaction(transactionData);
    
    // 2. Recalculate goals/budgets (best-effort - should not fail transaction)
    try {
      if (transaction.type === 'income') {
        const goals = await getGoalsByWallet(transaction.wallet_id);
        for (const goal of goals) {
          if (goal.id) {
            try {
              await recalculateGoalProgress(goal.id);
            } catch (goalError) {
              // Log but don't throw - individual goal recalc failure shouldn't block
              console.error(`Failed to recalculate goal ${goal.id}:`, goalError);
            }
          }
        }
      }
      
      if (transaction.type === 'expense') {
        const budgets = await getBudgetsByWallet(transaction.wallet_id);
        for (const budget of budgets) {
          if (budget.id) {
            try {
              await recalculateBudgetSpending(budget.id);
            } catch (budgetError) {
              // Log but don't throw
              console.error(`Failed to recalculate budget ${budget.id}:`, budgetError);
            }
          }
        }
      }
    } catch (recalcError) {
      // Log recalculation failure but transaction is already saved
      console.error('Recalculation error (transaction already saved):', recalcError);
    }
    
    // 3. Success - transaction is definitely saved
    Alert.alert('Success', 'Transaction created');
    
  } catch (error) {
    // Transaction creation failed
    Alert.alert('Error', 'Failed to create transaction');
  }
}
```

---

## Summary

To integrate Goals & Budgets with transactions:

1. **After create**: Update goals (if income) and budgets (if expense)
2. **After edit**: Recalculate affected goals/budgets on old and new wallet
3. **After delete**: Recalculate goals/budgets for the deleted transaction's wallet
4. **Debounce**: Use the debouncing hook to prevent excessive queries
5. **Error handling**: Make recalculation best-effort, not transaction-blocking
6. **Categories**: When calculating budgets, check category match (parent or sub)
7. **Periods**: When calculating budgets, check if transaction is in budget's date range

This ensures that goals and budgets stay in sync with transactions automatically and efficiently.
