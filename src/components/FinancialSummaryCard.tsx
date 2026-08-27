import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BudgetWithMetrics } from '@/types/goal';
import type { GoalWithMetrics } from '@/types/goal';

interface FinancialSummaryCardProps {
  budgets: BudgetWithMetrics[];
  goals: GoalWithMetrics[];
  colors: any;
  defaultCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
  type: 'budget' | 'goal';
}

export function FinancialSummaryCard({ 
  budgets, 
  goals, 
  colors, 
  defaultCurrency, 
  formatCurrency,
  type 
}: FinancialSummaryCardProps) {
  
  if (type === 'budget') {
    const totalBudget = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.currentSpending, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    const summaryColor = overallPercentage > 100 
      ? colors.danger 
      : overallPercentage > 75 
      ? colors.primary 
      : colors.success;

    return (
      <View style={StyleSheet.flatten([styles.card, { backgroundColor: colors.card }]) as any}>
        <Text style={StyleSheet.flatten([styles.title, { color: colors.textPrimary }]) as any}>
          Total Budget Summary
        </Text>
        
        <View style={styles.mainAmount}>
          <Text style={StyleSheet.flatten([styles.mainLabel, { color: colors.textSecondary }]) as any}>
            Total Allocated
          </Text>
          <Text style={StyleSheet.flatten([styles.mainValue, { color: colors.textPrimary }]) as any}>
            {formatCurrency(totalBudget, defaultCurrency)}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={StyleSheet.flatten([
              styles.progressBarFill,
              {
                width: `${Math.min(overallPercentage, 100)}%`,
                backgroundColor: summaryColor,
              },
            ]) as any}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>
              Spent
            </Text>
            <Text style={StyleSheet.flatten([styles.statValue, { color: colors.textPrimary }]) as any}>
              {formatCurrency(totalSpent, defaultCurrency)}
            </Text>
            <Text style={StyleSheet.flatten([styles.statPercentage, { color: summaryColor }]) as any}>
              {overallPercentage.toFixed(0)}%
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>
              {totalRemaining >= 0 ? 'Remaining' : 'Over'}
            </Text>
            <Text style={StyleSheet.flatten([styles.statValue, { color: summaryColor }]) as any}>
              {formatCurrency(Math.abs(totalRemaining), defaultCurrency)}
            </Text>
            <Text style={StyleSheet.flatten([styles.statSubtext, { color: colors.textSecondary }]) as any}>
              {budgets.length} budget{budgets.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  } else {
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalProgress = goals.reduce((sum, g) => sum + g.currentProgress, 0);
    const totalRemaining = totalTarget - totalProgress;
    const overallPercentage = totalTarget > 0 ? (totalProgress / totalTarget) * 100 : 0;
    
    const summaryColor = overallPercentage >= 75 ? colors.success : colors.primary;

    return (
      <View style={StyleSheet.flatten([styles.card, { backgroundColor: colors.card }]) as any}>
        <Text style={StyleSheet.flatten([styles.title, { color: colors.textPrimary }]) as any}>
          Total Goals Summary
        </Text>
        
        <View style={styles.mainAmount}>
          <Text style={StyleSheet.flatten([styles.mainLabel, { color: colors.textSecondary }]) as any}>
            Total Target
          </Text>
          <Text style={StyleSheet.flatten([styles.mainValue, { color: colors.textPrimary }]) as any}>
            {formatCurrency(totalTarget, defaultCurrency)}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={StyleSheet.flatten([
              styles.progressBarFill,
              {
                width: `${Math.min(overallPercentage, 100)}%`,
                backgroundColor: summaryColor,
              },
            ]) as any}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>
              Saved
            </Text>
            <Text style={StyleSheet.flatten([styles.statValue, { color: colors.textPrimary }]) as any}>
              {formatCurrency(totalProgress, defaultCurrency)}
            </Text>
            <Text style={StyleSheet.flatten([styles.statPercentage, { color: summaryColor }]) as any}>
              {overallPercentage.toFixed(0)}%
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>
              Remaining
            </Text>
            <Text style={StyleSheet.flatten([styles.statValue, { color: colors.textPrimary }]) as any}>
              {formatCurrency(Math.max(0, totalRemaining), defaultCurrency)}
            </Text>
            <Text style={StyleSheet.flatten([styles.statSubtext, { color: colors.textSecondary }]) as any}>
              {goals.length} goal{goals.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    marginHorizontal: 5,
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  mainAmount: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mainLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  mainValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Will adapt to theme
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  statSubtext: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
});
