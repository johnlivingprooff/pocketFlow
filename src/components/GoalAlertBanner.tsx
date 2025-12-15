import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react';
import { useRouter } from 'expo-router';
import type { GoalWithMetrics } from '@/types/goal';

interface GoalAlertBannerProps {
  goals: GoalWithMetrics[];
  colors: any;
  defaultCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
}

export function GoalAlertBanner({ goals, colors, defaultCurrency, formatCurrency }: GoalAlertBannerProps) {
  const router = useRouter();

  // Get goals that need attention (behind schedule or approaching deadline)
  const atRiskGoals = goals.filter(g => !g.onTrack && (g.progressPercentage || 0) < 100);
  const upcomingDeadlines = goals.filter(g => 
    g.daysRemaining > 0 && 
    g.daysRemaining <= 30 && 
    (g.progressPercentage || 0) < 100
  ).sort((a, b) => a.daysRemaining - b.daysRemaining);

  if (atRiskGoals.length === 0 && upcomingDeadlines.length === 0) {
    return null;
  }

  const renderAlert = (goal: GoalWithMetrics, isAtRisk: boolean) => {
    const alertColor = isAtRisk ? colors.primary : colors.success;
    const icon = isAtRisk ? '⚠️' : '⏰';
    const title = isAtRisk ? 'Behind Schedule' : 'Deadline Approaching';
    
    return (
      <Pressable
        key={goal.id}
        onPress={() => router.push(`/goals/${goal.id}`)}
        style={[styles.alertCard, { backgroundColor: `${alertColor}${ALERT_BACKGROUND_OPACITY}`, borderColor: alertColor }]}
      >
        <View style={styles.alertHeader}>
          <Text style={styles.alertIcon}>{icon}</Text>
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: alertColor }]}>
              {title}
            </Text>
            <Text style={[styles.alertGoalName, { color: colors.textPrimary }]}>
              {goal.name}
            </Text>
            <Text style={[styles.alertDetails, { color: colors.textSecondary }]}>
              {isAtRisk 
                ? `Need ${formatCurrency(goal.monthlyRequired, defaultCurrency)}/month to stay on track`
                : `${goal.daysRemaining} days left • ${formatCurrency(goal.targetAmount - goal.currentProgress, defaultCurrency)} remaining`
              }
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {atRiskGoals.slice(0, 2).map(goal => renderAlert(goal, true))}
      {upcomingDeadlines.slice(0, 1).map(goal => renderAlert(goal, false))}
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
  alertGoalName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertDetails: {
    fontSize: 12,
    fontWeight: '500',
  },
});
