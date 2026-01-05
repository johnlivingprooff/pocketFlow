import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Budget } from '@/types/goal';
import { theme } from '@/theme/theme';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/useStore';
import { formatCurrency } from '@/utils/formatCurrency';

interface BudgetCardProps {
  budget: Budget;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget }) => {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const percentage = Math.min((budget.currentSpending / budget.limitAmount) * 100, 100);
  const remaining = Math.max(budget.limitAmount - budget.currentSpending, 0);
  
  // Determine color based on spending percentage
  let progressColor = t.success; // Green
  if (percentage >= 80) progressColor = t.danger; // Red if over 80%
  else if (percentage >= 60) progressColor = t.primary; // Primary color if 60-80%

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Budget Name */}
      <Text style={[styles.budgetName, { color: t.textPrimary }]}>
        {budget.name}
      </Text>

      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: t.background, borderColor: t.border }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* Spent and Remaining Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Spent</Text>
          <Text style={[styles.infoValue, { color: t.textPrimary }]}>
            {formatCurrency(budget.currentSpending, defaultCurrency)}
          </Text>
        </View>
        
        <View style={styles.percentageItem}>
          <Text style={[styles.percentageText, { color: progressColor }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.infoItem, { alignItems: 'flex-end' }]}>
          <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Remaining</Text>
          <Text style={[styles.infoValue, { color: t.success }]}>
            {formatCurrency(remaining, defaultCurrency)}
          </Text>
        </View>
      </View>

      {/* Limit Info */}
      <Text style={[styles.limitText, { color: t.textSecondary }]}>
        Limit: {formatCurrency(budget.limitAmount, defaultCurrency)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
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
    marginBottom: 8,
  },
  infoItem: {
    flex: 1,
  },
  percentageItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  limitText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
