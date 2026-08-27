import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Budget } from '@/types/goal';
import { theme } from '@/theme/theme';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/useStore';
import { formatCurrency } from '@/utils/formatCurrency';

interface BudgetCardProps {
  budget: Budget;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget }) => {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const percentage = Math.min((budget.currentSpending / budget.limitAmount) * 100, 100);
  const remaining = Math.max(budget.limitAmount - budget.currentSpending, 0);

  // Determine status and color
  // Yellow warning at 75-85%, red danger at 85%+
  let progressColor = t.success;
  let statusText = 'On Track';
  let statusBgColor = t.success + '20';

  if (percentage >= 85) {
    progressColor = t.danger;
    statusText = 'Over Budget';
    statusBgColor = t.danger + '20';
  } else if (percentage >= 75) {
    progressColor = t.warning;
    statusText = 'Caution';
    statusBgColor = t.warning + '20';
  }

  return (
    <View style={StyleSheet.flatten([styles.card, { backgroundColor: t.card, borderColor: t.border }]) as any}>
      {/* Header with name and status */}
      <View style={styles.header}>
        <Text style={StyleSheet.flatten([styles.budgetName, { color: t.textPrimary }]) as any}>
          {budget.name}
        </Text>
        <View style={StyleSheet.flatten([styles.statusBadge, { backgroundColor: statusBgColor }]) as any}>
          <Text style={StyleSheet.flatten([styles.statusText, { color: progressColor }]) as any}>{statusText}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={StyleSheet.flatten([styles.progressBarContainer, { backgroundColor: t.background, borderColor: t.border }]) as any}>
        <View
          style={StyleSheet.flatten([
            styles.progressBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: progressColor,
            },
          ]) as any}
        />
      </View>

      {/* Spent and Remaining Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={StyleSheet.flatten([styles.infoLabel, { color: t.textSecondary }]) as any}>Spent</Text>
          <Text style={StyleSheet.flatten([styles.infoValue, { color: percentage >= 100 ? t.danger : t.textPrimary }]) as any}>
            {formatCurrency(budget.currentSpending, defaultCurrency)}
          </Text>
        </View>

        <View style={styles.percentageItem}>
          <Text style={StyleSheet.flatten([styles.percentageText, { color: progressColor }]) as any}>
            {percentage.toFixed(0)}%
          </Text>
        </View>

        <View style={StyleSheet.flatten([styles.infoItem, { alignItems: 'flex-end' }]) as any}>
          <Text style={StyleSheet.flatten([styles.infoLabel, { color: t.textSecondary }]) as any}>Remaining</Text>
          <Text style={StyleSheet.flatten([styles.infoValue, { color: remaining > 0 ? t.success : t.danger }]) as any}>
            {formatCurrency(remaining, defaultCurrency)}
          </Text>
        </View>
      </View>

      {/* Footer with limit and details link */}
      <View style={styles.footer}>
        <Text style={StyleSheet.flatten([styles.limitText, { color: t.textSecondary }]) as any}>
          Limit: {formatCurrency(budget.limitAmount, defaultCurrency)}
        </Text>
        <TouchableOpacity onPress={() => router.push(`/budgets/${budget.id}`)}>
          <Text style={StyleSheet.flatten([styles.detailsLink, { color: t.primary }]) as any}>Details ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  percentageItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150, 0.1)',
  },
  limitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsLink: {
    fontSize: 12,
    fontWeight: '600',
  },
});
