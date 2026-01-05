import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Goal } from '@/types/goal';
import { theme } from '@/theme/theme';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/useStore';
import { formatCurrency } from '@/utils/formatCurrency';

interface GoalCardProps {
  goal: Goal;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const percentage = Math.min((goal.currentProgress / goal.targetAmount) * 100, 100);
  const remaining = Math.max(goal.targetAmount - goal.currentProgress, 0);
  
  // Determine color based on progress
  let progressColor = t.primary; // Primary color
  if (percentage >= 100) progressColor = t.success; // Green if goal reached

  const targetDate = new Date(goal.targetDate);
  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Goal Name */}
      <Text style={[styles.goalName, { color: t.textPrimary }]}>
        {goal.name}
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

      {/* Saved and Remaining Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Saved</Text>
          <Text style={[styles.infoValue, { color: t.textPrimary }]}>
            {formatCurrency(goal.currentProgress, defaultCurrency)}
          </Text>
        </View>
        
        <View style={styles.percentageItem}>
          <Text style={[styles.percentageText, { color: progressColor }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.infoItem, { alignItems: 'flex-end' }]}>
          <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Remaining</Text>
          <Text style={[styles.infoValue, { color: t.textPrimary }]}>
            {formatCurrency(remaining, defaultCurrency)}
          </Text>
        </View>
      </View>

      {/* Target and Deadline Info */}
      <View style={styles.footerRow}>
        <Text style={[styles.targetText, { color: t.textSecondary }]}>
          Target: {formatCurrency(goal.targetAmount, defaultCurrency)}
        </Text>
        <Text style={[styles.deadlineText, { color: daysRemaining < 0 ? t.danger : t.textSecondary }]}>
          {daysRemaining < 0 
            ? `${Math.abs(daysRemaining)} days overdue` 
            : daysRemaining === 0
            ? 'Due today'
            : `${daysRemaining} days left`}
        </Text>
      </View>
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
  goalName: {
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
