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
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Total Budget Summary
        </Text>
        
        <View style={styles.mainAmount}>
          <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>
            Total Allocated
          </Text>
          <Text style={[styles.mainValue, { color: colors.textPrimary }]}>
            {formatCurrency(totalBudget, defaultCurrency)}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(overallPercentage, 100)}%`,
                backgroundColor: summaryColor,
              },
            ]}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Spent
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatCurrency(totalSpent, defaultCurrency)}
            </Text>
            <Text style={[styles.statPercentage, { color: summaryColor }]}>
              {overallPercentage.toFixed(0)}%
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {totalRemaining >= 0 ? 'Remaining' : 'Over'}
            </Text>
            <Text style={[styles.statValue, { color: summaryColor }]}>
              {formatCurrency(Math.abs(totalRemaining), defaultCurrency)}
            </Text>
            <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
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
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Total Goals Summary
        </Text>
        
        <View style={styles.mainAmount}>
          <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>
            Total Target
          </Text>
          <Text style={[styles.mainValue, { color: colors.textPrimary }]}>
            {formatCurrency(totalTarget, defaultCurrency)}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(overallPercentage, 100)}%`,
                backgroundColor: summaryColor,
              },
            ]}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Saved
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatCurrency(totalProgress, defaultCurrency)}
            </Text>
            <Text style={[styles.statPercentage, { color: summaryColor }]}>
              {overallPercentage.toFixed(0)}%
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Remaining
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatCurrency(Math.max(0, totalRemaining), defaultCurrency)}
            </Text>
            <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
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
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
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
