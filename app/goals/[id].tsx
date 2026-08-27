import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { error as logError } from '@/utils/logger';
import { getGoalWithMetrics, deleteGoal } from '@/lib/db/goals';
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/ThemedAlert';
import type { GoalWithMetrics } from '@/types/goal';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const colors = theme(themeMode, systemColorScheme || 'light');

  const [goal, setGoal] = useState<GoalWithMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { alertConfig, showErrorAlert, showConfirmAlert, dismissAlert } = useAlert();

  const goalId = typeof id === 'string' ? parseInt(id) : null;

  useFocusEffect(
    React.useCallback(() => {
      loadGoal();
    }, [goalId])
  );

  const loadGoal = async () => {
    if (!goalId) {
      showErrorAlert('Error', 'Invalid goal ID');
      router.back();
      return;
    }

    try {
      setLoading(true);
      // Small delay to allow recalculateGoalProgress write queue to complete
      // This ensures we don't get stale currentProgress values on newly created goals
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const data = await getGoalWithMetrics(goalId);
      if (!data) {
        showErrorAlert('Error', 'Goal not found');
        router.back();
        return;
      }
      setGoal(data);
    } catch (err: any) {
      logError('Failed to load goal:', { error: err });
      showErrorAlert('Error', 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/goals/${goalId}/edit`);
  };

  const handleDelete = () => {
    showConfirmAlert('Delete Goal', 'Are you sure you want to delete this goal? This action cannot be undone.', async () => {
      try {
        if (goalId) {
          await deleteGoal(goalId);
          showConfirmAlert('Success', 'Goal deleted', () => router.back());
        }
      } catch (err: any) {
        logError('Failed to delete goal:', { error: err });
        showErrorAlert('Error', 'Failed to delete goal');
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as any}>
        <View style={styles.loadingContainer}>
          <Text style={StyleSheet.flatten([styles.loadingText, { color: colors.textSecondary }]) as any}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as any}>
        <View style={styles.loadingContainer}>
          <Text style={StyleSheet.flatten([styles.loadingText, { color: colors.textSecondary }]) as any}>Goal not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = goal.onTrack ? colors.success : colors.primary;

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as any}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={StyleSheet.flatten([styles.headerCard, { backgroundColor: colors.card }]) as any}>
          <Text style={StyleSheet.flatten([styles.goalName, { color: colors.textPrimary }]) as any}>
            {goal.name}
          </Text>
          <Text style={StyleSheet.flatten([styles.targetAmount, { color: colors.textSecondary }]) as any}>
            Target: {formatCurrency(goal.targetAmount, defaultCurrency)}
          </Text>
        </View>

        {/* Progress Section */}
        <View style={StyleSheet.flatten([styles.section, { backgroundColor: colors.card }]) as any}>
          <Text style={StyleSheet.flatten([styles.sectionTitle, { color: colors.textPrimary }]) as any}>Progress</Text>

          <View style={styles.progressContainer}>
            <View
              style={StyleSheet.flatten([
                styles.progressBar,
                {
                  width: `${Math.min(goal.progressPercentage || 0, 100)}%`,
                  backgroundColor: statusColor,
                },
              ]) as any}
            />
          </View>

          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>Saved</Text>
              <Text style={StyleSheet.flatten([styles.statValue, { color: colors.textPrimary }]) as any}>
                {formatCurrency(goal.currentProgress, defaultCurrency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>Target</Text>
              <Text style={StyleSheet.flatten([styles.statValue, { color: colors.textPrimary }]) as any}>
                {formatCurrency(goal.targetAmount, defaultCurrency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>Remaining</Text>
              <Text style={StyleSheet.flatten([styles.statValue, { color: statusColor }]) as any}>
                {formatCurrency(Math.max(0, goal.targetAmount - goal.currentProgress), defaultCurrency)}
              </Text>
            </View>
          </View>

          <View style={StyleSheet.flatten([styles.percentageContainer, { backgroundColor: colors.background }]) as any}>
            <Text style={StyleSheet.flatten([styles.percentageText, { color: colors.textSecondary }]) as any}>
              {goal.progressPercentage?.toFixed(1) || '0'}% complete
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={StyleSheet.flatten([styles.section, { backgroundColor: colors.card }]) as any}>
          <Text style={StyleSheet.flatten([styles.sectionTitle, { color: colors.textPrimary }]) as any}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>
              Target Date
            </Text>
            <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
              {new Date(goal.targetDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={StyleSheet.flatten([styles.divider, { backgroundColor: colors.border }]) as any} />

          <View style={styles.detailRow}>
            <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>
              Monthly Required
            </Text>
            <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
              {formatCurrency(goal.monthlyRequired, defaultCurrency)}
            </Text>
          </View>

          {goal.daysRemaining !== undefined && goal.daysRemaining > 0 && (
            <>
              <View style={StyleSheet.flatten([styles.divider, { backgroundColor: colors.border }]) as any} />
              <View style={styles.detailRow}>
                <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>
                  Days Remaining
                </Text>
                <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
                  {goal.daysRemaining} day{goal.daysRemaining !== 1 ? 's' : ''}
                </Text>
              </View>
            </>
          )}

          {goal.notes && (
            <>
              <View style={StyleSheet.flatten([styles.divider, { backgroundColor: colors.border }]) as any} />
              <View style={styles.detailRow}>
                <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>Notes</Text>
                <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
                  {goal.notes}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Status Section */}
        <View style={StyleSheet.flatten([styles.section, { backgroundColor: colors.card }]) as any}>
          <Text style={StyleSheet.flatten([styles.sectionTitle, { color: colors.textPrimary }]) as any}>Status</Text>

          <View
            style={StyleSheet.flatten([
              styles.statusBadge,
              {
                backgroundColor: `${statusColor}20`,
                borderColor: statusColor,
              },
            ]) as any}
          >
            <Text style={StyleSheet.flatten([styles.statusText, { color: statusColor }]) as any}>
              {goal.onTrack ? '✅ On Track' : '⚠️  Behind Schedule'}
            </Text>
          </View>

          <Text style={StyleSheet.flatten([styles.statusDescription, { color: colors.textSecondary }]) as any}>
            {goal.onTrack
              ? `Keep saving ${formatCurrency(goal.monthlyRequired, defaultCurrency)} monthly to reach your goal on time.`
              : `You need to save ${formatCurrency(goal.monthlyRequired, defaultCurrency)} monthly to catch up.`}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            onPress={handleEdit}
            style={StyleSheet.flatten([
              styles.actionButton,
              { backgroundColor: colors.primary },
            ]) as any}
          >
            <Text style={StyleSheet.flatten([styles.actionButtonText, { color: colors.background }]) as any}>
              Edit Goal
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={StyleSheet.flatten([
              styles.actionButton,
              { backgroundColor: colors.danger },
            ]) as any}
          >
            <Text style={StyleSheet.flatten([styles.actionButtonText, { color: colors.background }]) as any}>
              Delete Goal
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Themed Alert Component */}
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  headerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  goalName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressContainer: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  percentageContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  statusBadge: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
