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
import { getBudgetWithMetrics, deleteBudget } from '@/lib/db/budgets';
import type { BudgetWithMetrics } from '@/types/goal';
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/ThemedAlert';

export default function BudgetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const colors = theme(themeMode, systemColorScheme || 'light');
  const { alertConfig, showErrorAlert, showConfirmAlert, showSuccessAlert, dismissAlert, setAlertConfig } = useAlert();

  const [budget, setBudget] = useState<BudgetWithMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const budgetId = typeof id === 'string' ? parseInt(id) : null;

  useFocusEffect(
    React.useCallback(() => {
      loadBudget();
    }, [budgetId])
  );

  const loadBudget = async () => {
    if (!budgetId) {
      showErrorAlert('Error', 'Invalid budget ID');
      router.back();
      return;
    }

    try {
      setLoading(true);
      // Small delay to allow recalculateBudgetSpending write queue to complete
      // This ensures we don't get stale currentSpending values on newly created budgets
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const data = await getBudgetWithMetrics(budgetId);
      if (!data) {
        showErrorAlert('Error', 'Budget not found');
        router.back();
        return;
      }
      setBudget(data);
    } catch (err: any) {
      logError('Failed to load budget:', { error: err });
      showErrorAlert('Error', 'Failed to load budget details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/budgets/${budgetId}/edit`);
  };

  const handleDelete = () => {
    setAlertConfig({
      visible: true,
      title: 'Delete Budget',
      message: 'Are you sure you want to delete this budget? This action cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (budgetId) {
                await deleteBudget(budgetId);
                showSuccessAlert('Success', 'Budget deleted', () => router.back());
              }
            } catch (err: any) {
              logError('Failed to delete budget:', { error: err });
              showErrorAlert('Error', 'Failed to delete budget');
            }
          },
        },
      ],
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

  if (!budget) {
    return (
      <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as any}>
        <View style={styles.loadingContainer}>
          <Text style={StyleSheet.flatten([styles.loadingText, { color: colors.textSecondary }]) as any}>Budget not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = budget.isOverBudget
    ? colors.danger
    : (budget.percentageUsed || 0) > 75
    ? colors.primary
    : colors.success;

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as any}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={StyleSheet.flatten([styles.headerCard, { backgroundColor: colors.card }]) as any}>
          <Text style={StyleSheet.flatten([styles.budgetName, { color: colors.textPrimary }]) as any}>
            {budget.name}
          </Text>
          <Text style={StyleSheet.flatten([styles.periodType, { color: colors.textSecondary }]) as any}>
            {budget.periodType === 'custom'
              ? `${new Date(budget.startDate).toLocaleDateString()} - ${new Date(budget.endDate).toLocaleDateString()}`
              : budget.periodType === 'weekly'
              ? 'Weekly Budget'
              : 'Monthly Budget'}
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
                  width: `${Math.min(budget.percentageUsed || 0, 100)}%`,
                  backgroundColor: statusColor,
                },
              ]) as any}
            />
          </View>

          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>Spent</Text>
              <Text style={StyleSheet.flatten([styles.statValue, { color: colors.textPrimary }]) as any}>
                {formatCurrency(budget.currentSpending, defaultCurrency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>Limit</Text>
              <Text style={StyleSheet.flatten([styles.statValue, { color: colors.textPrimary }]) as any}>
                {formatCurrency(budget.limitAmount, defaultCurrency)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }]) as any}>
                {budget.isOverBudget ? 'Over' : 'Remaining'}
              </Text>
              <Text style={StyleSheet.flatten([styles.statValue, { color: statusColor }]) as any}>
                {formatCurrency(Math.abs(budget.remainingBalance), defaultCurrency)}
              </Text>
            </View>
          </View>

          <View style={StyleSheet.flatten([styles.percentageContainer, { backgroundColor: colors.background }]) as any}>
            <Text style={StyleSheet.flatten([styles.percentageText, { color: colors.textSecondary }]) as any}>
              {budget.percentageUsed?.toFixed(1) || '0'}% of limit used
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={StyleSheet.flatten([styles.section, { backgroundColor: colors.card }]) as any}>
          <Text style={StyleSheet.flatten([styles.sectionTitle, { color: colors.textPrimary }]) as any}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>Period</Text>
            <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
              {budget.periodType.charAt(0).toUpperCase() + budget.periodType.slice(1)}
            </Text>
          </View>

          <View style={StyleSheet.flatten([styles.divider, { backgroundColor: colors.border }]) as any} />

          <View style={styles.detailRow}>
            <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>
              Start Date
            </Text>
            <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
              {new Date(budget.startDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={StyleSheet.flatten([styles.divider, { backgroundColor: colors.border }]) as any} />

          <View style={styles.detailRow}>
            <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>
              End Date
            </Text>
            <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
              {new Date(budget.endDate).toLocaleDateString()}
            </Text>
          </View>

          {budget.daysRemaining !== undefined && budget.daysRemaining > 0 && (
            <>
              <View style={StyleSheet.flatten([styles.divider, { backgroundColor: colors.border }]) as any} />
              <View style={styles.detailRow}>
                <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>
                  Days Remaining
                </Text>
                <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
                  {budget.daysRemaining} day{budget.daysRemaining !== 1 ? 's' : ''}
                </Text>
              </View>
            </>
          )}

          {budget.notes && (
            <>
              <View style={StyleSheet.flatten([styles.divider, { backgroundColor: colors.border }]) as any} />
              <View style={styles.detailRow}>
                <Text style={StyleSheet.flatten([styles.detailLabel, { color: colors.textSecondary }]) as any}>Notes</Text>
                <Text style={StyleSheet.flatten([styles.detailValue, { color: colors.textPrimary }]) as any}>
                  {budget.notes}
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
              {budget.isOverBudget
                ? '❌ Over Budget'
                : (budget.percentageUsed || 0) > 75
                ? '⚠️  Approaching Limit'
                : '✅ On Track'}
            </Text>
          </View>
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
              Edit Budget
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
              Delete Budget
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
  budgetName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  periodType: {
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
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
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
