import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../theme/theme';
import { useSettings } from '../store/useStore';
import { BudgetWithMetrics } from '../types/goal';
import { formatCurrency } from '../utils/formatCurrency';

interface BudgetSummaryWidgetProps {
  budgets: BudgetWithMetrics[];
  isLoading?: boolean;
}

export function BudgetSummaryWidget({ budgets, isLoading = false }: BudgetSummaryWidgetProps) {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);

  const summary = useMemo(() => {
    if (budgets.length === 0) return null;

    const active = budgets.filter((b) => b.period_status === 'active');
    const overBudget = active.filter((b) => b.isOverBudget).length;
    const nearLimit = active.filter((b) => !b.isOverBudget && b.percentageUsed >= 80).length;
    const totalSpent = active.reduce((sum, b) => sum + b.spent, 0);
    const totalBudget = active.reduce((sum, b) => sum + b.amount, 0);

    return {
      activeCount: active.length,
      overBudget,
      nearLimit,
      totalSpent,
      totalBudget,
    };
  }, [budgets]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: t.card, borderColor: t.border }]}> 
        <Text style={[styles.title, { color: t.textPrimary }]}>Budgets</Text>
        <Text style={{ color: t.textSecondary, marginTop: 8 }}>Loading budgets...</Text>
      </View>
    );
  }

  if (!summary || summary.activeCount === 0) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/budget')}
        style={[styles.container, { backgroundColor: t.card, borderColor: t.border }]}
      >
        <Text style={[styles.title, { color: t.textPrimary }]}>Budgets</Text>
        <Text style={{ color: t.textSecondary, marginTop: 8 }}>No active budgets. Tap to set one up.</Text>
      </TouchableOpacity>
    );
  }

  const progress = summary.totalBudget > 0 ? Math.min(summary.totalSpent / summary.totalBudget, 1) : 0;
  const progressColor = summary.overBudget > 0 ? t.danger : summary.nearLimit > 0 ? t.warning : t.success;

  return (
    <TouchableOpacity
      onPress={() => router.push('/budget')}
      style={[styles.container, { backgroundColor: t.card, borderColor: t.border }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Budgets</Text>
        <Text style={[styles.link, { color: t.accent }]}>Open</Text>
      </View>

      <Text style={[styles.amount, { color: t.textPrimary }]}> 
        {formatCurrency(summary.totalSpent, defaultCurrency)} / {formatCurrency(summary.totalBudget, defaultCurrency)}
      </Text>

      <View style={[styles.progressTrack, { backgroundColor: t.background }]}> 
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: t.textSecondary }]}>{summary.activeCount} active</Text>
        <Text style={[styles.metaText, { color: summary.overBudget > 0 ? t.danger : summary.nearLimit > 0 ? t.warning : t.success }]}>
          {summary.overBudget > 0 ? `${summary.overBudget} over limit` : summary.nearLimit > 0 ? `${summary.nearLimit} near limit` : 'On track'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
