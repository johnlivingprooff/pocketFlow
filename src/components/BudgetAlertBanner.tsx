import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { BudgetWithMetrics } from '@/types/goal';

const ALERT_BACKGROUND_OPACITY = '15'; // Hex opacity for alert backgrounds

interface BudgetAlertBannerProps {
  budgets: BudgetWithMetrics[];
  colors: any;
  defaultCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
}

export function BudgetAlertBanner({ budgets, colors, defaultCurrency, formatCurrency }: BudgetAlertBannerProps) {
  const router = useRouter();

  // Get budgets that need attention (over budget or approaching limit)
  const overBudgets = budgets.filter(b => b.isOverBudget);
  const warningBudgets = budgets.filter(b => !b.isOverBudget && (b.percentageUsed || 0) >= 75);

  if (overBudgets.length === 0 && warningBudgets.length === 0) {
    return null;
  }

  const renderAlert = (budget: BudgetWithMetrics, isOver: boolean) => {
    const alertColor = isOver ? colors.danger : colors.primary;
    const icon = isOver ? '⚠️' : '⚡';
    const title = isOver ? 'Over Budget' : 'Approaching Limit';
    
    return (
      <Pressable
        key={budget.id}
        onPress={() => router.push(`/budgets/${budget.id}`)}
        style={[styles.alertCard, { backgroundColor: `${alertColor}${ALERT_BACKGROUND_OPACITY}`, borderColor: alertColor }]}
      >
        <View style={styles.alertHeader}>
          <Text style={styles.alertIcon}>{icon}</Text>
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: alertColor }]}>
              {title}
            </Text>
            <Text style={[styles.alertBudgetName, { color: colors.textPrimary }]}>
              {budget.name}
            </Text>
            <Text style={[styles.alertDetails, { color: colors.textSecondary }]}>
              {isOver 
                ? `You've exceeded by ${formatCurrency(Math.abs(budget.remainingBalance), defaultCurrency)}`
                : `${formatCurrency(Math.abs(budget.remainingBalance), defaultCurrency)} remaining (${budget.percentageUsed?.toFixed(0)}% used)`
              }
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {overBudgets.map(budget => renderAlert(budget, true))}
      {warningBudgets.slice(0, 2).map(budget => renderAlert(budget, false))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    gap: 8,
  },
  alertCard: {
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  alertBudgetName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertDetails: {
    fontSize: 12,
    fontWeight: '500',
  },
});
