import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Goal } from '@/types/goal';
import { theme } from '@/theme/theme';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/useStore';
import { formatCurrency } from '@/utils/formatCurrency';

interface GoalCardProps {
  goal: Goal;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const percentage = Math.min((goal.currentProgress / goal.targetAmount) * 100, 100);
  const remaining = Math.max(goal.targetAmount - goal.currentProgress, 0);

  const targetDate = new Date(goal.targetDate);
  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Determine status and color
  let progressColor = t.primary;
  let statusText = 'On Track';
  let statusBgColor = t.primary + '20';

  if (percentage >= 100) {
    progressColor = t.success;
    statusText = 'Achieved';
    statusBgColor = t.success + '20';
  } else if (daysRemaining < 0) {
    progressColor = t.danger;
    statusText = 'Overdue';
    statusBgColor = t.danger + '20';
  } else if (daysRemaining <= 30 && percentage < 75) {
    progressColor = t.warning;
    statusText = 'Behind';
    statusBgColor = t.warning + '20';
  }

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Header with name and status */}
      <View style={styles.header}>
        <Text style={[styles.goalName, { color: t.textPrimary }]}>
          {goal.name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
          <Text style={[styles.statusText, { color: progressColor }]}>{statusText}</Text>
        </View>
      </View>

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
          <Text style={[styles.infoValue, { color: remaining > 0 ? t.textPrimary : t.success }]}>
            {formatCurrency(remaining, defaultCurrency)}
          </Text>
        </View>
      </View>

      {/* Footer with target, deadline and details link */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={[styles.targetText, { color: t.textSecondary }]}>
            Target: {formatCurrency(goal.targetAmount, defaultCurrency)}
          </Text>
          <Text style={[styles.deadlineText, { color: daysRemaining < 0 ? t.danger : daysRemaining <= 7 ? t.warning : t.textSecondary }]}>
            {daysRemaining < 0
              ? `${Math.abs(daysRemaining)} days overdue`
              : daysRemaining === 0
                ? 'Due today'
                : `${daysRemaining} days left`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/goals/${goal.id}`)}>
          <Text style={[styles.detailsLink, { color: t.primary }]}>Details ›</Text>
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
  goalName: {
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
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150, 0.1)',
  },
  footerLeft: {
    flex: 1,
  },
  targetText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailsLink: {
    fontSize: 12,
    fontWeight: '600',
  },
});
