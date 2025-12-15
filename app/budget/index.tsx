import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, useColorScheme, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';
import { error as logError } from '@/utils/logger';
import { formatCurrency } from '@/utils/formatCurrency';
import { getBudgets, getBudgetWithMetrics, deleteBudget } from '@/lib/db/budgets';
import { getGoals, getGoalWithMetrics, deleteGoal } from '@/lib/db/goals';
import type { BudgetWithMetrics } from '@/types/goal';
import type { GoalWithMetrics } from '@/types/goal';
import { BudgetAlertBanner } from '@/components/BudgetAlertBanner';
import { GoalAlertBanner } from '@/components/GoalAlertBanner';
import { FinancialSummaryCard } from '@/components/FinancialSummaryCard';

type TabType = 'budget' | 'goals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export default function BudgetGoalsScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const colors = theme(themeMode, systemColorScheme || 'light');
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [budgets, setBudgets] = useState<BudgetWithMetrics[]>([]);
  const [goals, setGoals] = useState<GoalWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const translateX = useSharedValue(0);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      // Load all budgets and enrich with metrics in parallel for better performance
      const allBudgets = await getBudgets();
      const budgetsWithMetrics = await Promise.all(
        allBudgets.map(async (budget) => {
          const budgetWithMetrics = await getBudgetWithMetrics(budget.id!);
          return budgetWithMetrics;
        })
      );
      setBudgets(budgetsWithMetrics.filter((b): b is BudgetWithMetrics => b !== null));

      // Load all goals and enrich with metrics in parallel for better performance
      const allGoals = await getGoals();
      const goalsWithMetrics = await Promise.all(
        allGoals.map(async (goal) => {
          const goalWithMetrics = await getGoalWithMetrics(goal.id!);
          return goalWithMetrics;
        })
      );
      setGoals(goalsWithMetrics.filter((g): g is GoalWithMetrics => g !== null));
    } catch (err: any) {
      logError('Failed to load budgets/goals data:', { error: err });
      Alert.alert('Error', 'Failed to load budgets and goals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteBudget = (budgetId: number) => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudget(budgetId);
            loadData();
            Alert.alert('Success', 'Budget deleted');
          } catch (err: any) {
            logError('Failed to delete budget:', { error: err });
            Alert.alert('Error', 'Failed to delete budget');
          }
        },
      },
    ]);
  };

  const handleDeleteGoal = (goalId: number) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goalId);
            loadData();
            Alert.alert('Success', 'Goal deleted');
          } catch (err: any) {
            logError('Failed to delete goal:', { error: err });
            Alert.alert('Error', 'Failed to delete goal');
          }
        },
      },
    ]);
  };

  const handleEditBudget = (budgetId: number) => {
    router.push(`/budgets/${budgetId}/edit`);
  };

  const handleEditGoal = (goalId: number) => {
    router.push(`/goals/${goalId}/edit`);
  };
  
  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    // Animate to the correct position: budget = 0, goals = -SCREEN_WIDTH
    translateX.value = withTiming(tab === 'budget' ? 0 : -SCREEN_WIDTH, {
      duration: 250,
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Calculate target position based on current tab
      const baseOffset = activeTab === 'budget' ? 0 : -SCREEN_WIDTH;
      translateX.value = baseOffset + e.translationX;
      
      // Clamp to prevent over-scrolling
      if (translateX.value > 0) {
        translateX.value = 0;
      } else if (translateX.value < -SCREEN_WIDTH) {
        translateX.value = -SCREEN_WIDTH;
      }
    })
    .onEnd((e) => {
      const currentOffset = activeTab === 'budget' ? 0 : -SCREEN_WIDTH;
      const finalPosition = currentOffset + e.translationX;
      
      // Determine which tab to snap to based on position and velocity
      const shouldSwitchToGoals = 
        finalPosition < -SCREEN_WIDTH / 2 || 
        (e.velocityX < -500 && activeTab === 'budget');
      const shouldSwitchToBudget = 
        finalPosition > -SCREEN_WIDTH / 2 || 
        (e.velocityX > 500 && activeTab === 'goals');
      
      if (shouldSwitchToGoals && activeTab === 'budget') {
        runOnJS(switchTab)('goals');
      } else if (shouldSwitchToBudget && activeTab === 'goals') {
        runOnJS(switchTab)('budget');
      } else {
        // Snap back to current tab
        translateX.value = withTiming(currentOffset, {
          duration: 250,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const renderBudgetItem = (item: BudgetWithMetrics) => (
    <View key={item.id}>
      <Pressable
        onPress={() => handleEditBudget(item.id!)}
        style={[styles.categoryCard, { backgroundColor: colors.card }]}
        android_ripple={{ color: colors.primary }}
      >
      <View style={styles.categoryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
            {item.name}
          </Text>
          <Text style={[styles.categorySubtext, { color: colors.textSecondary }]}>
            {item.periodType === 'custom'
              ? `${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`
              : item.periodType === 'weekly'
              ? 'Weekly'
              : 'Monthly'}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDeleteBudget(item.id!)}
          hitSlop={12}
          style={{ paddingLeft: 8 }}
        >
          <Text style={[styles.deleteButton, { color: colors.danger }]}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(item.percentageUsed || 0, 100)}%`,
              backgroundColor:
                item.isOverBudget
                  ? colors.danger
                  : (item.percentageUsed || 0) > 75
                  ? colors.primary
                  : colors.success,
            },
          ]}
        />
      </View>

      <View style={styles.budgetInfo}>
        <View>
          <Text style={[styles.budgetText, { color: colors.textSecondary }]}>
            Spent: {formatCurrency(item.currentSpending, defaultCurrency)}
          </Text>
          <Text style={[styles.budgetText, { color: colors.textSecondary }]}>
            Limit: {formatCurrency(item.limitAmount, defaultCurrency)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              styles.remainingText,
              {
                color: item.isOverBudget ? colors.danger : colors.success,
              },
            ]}
          >
            {item.isOverBudget ? 'Over' : 'Remaining'}: {formatCurrency(Math.abs(item.remainingBalance), defaultCurrency)}
          </Text>
          <Text style={[styles.percentageText, { color: colors.textSecondary }]}>
            {item.percentageUsed?.toFixed(0) || '0'}%
          </Text>
        </View>
      </View>

      {item.daysRemaining !== undefined && item.daysRemaining > 0 && (
        <View style={[styles.paceIndicator, { backgroundColor: colors.background }]}>
          <Text style={[styles.paceText, { color: colors.textSecondary }]}>
            {item.daysRemaining} day{item.daysRemaining !== 1 ? 's' : ''} left • 
            Daily avg: {formatCurrency(item.averageDailySpend, defaultCurrency)}
          </Text>
        </View>
      )}
      </Pressable>
    </View>
  );

  const renderGoalItem = (item: GoalWithMetrics) => (
    <View key={item.id}>
      <Pressable
        onPress={() => handleEditGoal(item.id!)}
        style={[styles.categoryCard, { backgroundColor: colors.card }]}
        android_ripple={{ color: colors.primary }}
      >
      <View style={styles.categoryHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            {(item.progressPercentage || 0) >= 100 && (
              <Text style={styles.milestoneBadge}>🎉</Text>
            )}
            {(item.progressPercentage || 0) >= 75 && (item.progressPercentage || 0) < 100 && (
              <Text style={styles.milestoneBadge}>🔥</Text>
            )}
            {(item.progressPercentage || 0) >= 50 && (item.progressPercentage || 0) < 75 && (
              <Text style={styles.milestoneBadge}>💪</Text>
            )}
            {(item.progressPercentage || 0) >= 25 && (item.progressPercentage || 0) < 50 && (
              <Text style={styles.milestoneBadge}>🌱</Text>
            )}
          </View>
          <Text style={[styles.categorySubtext, { color: colors.textSecondary }]}>
            Target: {formatCurrency(item.targetAmount, defaultCurrency)}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDeleteGoal(item.id!)}
          hitSlop={12}
          style={{ paddingLeft: 8 }}
        >
          <Text style={[styles.deleteButton, { color: colors.danger }]}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(item.progressPercentage || 0, 100)}%`,
              backgroundColor: item.onTrack ? colors.success : colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.budgetInfo}>
        <View>
          <Text style={[styles.budgetText, { color: colors.textSecondary }]}>
            Progress: {formatCurrency(item.currentProgress, defaultCurrency)}
          </Text>
          <Text style={[styles.budgetText, { color: colors.textSecondary }]}>
            Status: {item.onTrack ? '✓ On track' : '⚠ Behind'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.percentageText, { color: colors.textSecondary }]}>
            {item.progressPercentage?.toFixed(0) || '0'}%
          </Text>
          <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
            Monthly: {formatCurrency(item.monthlyRequired, defaultCurrency)}
          </Text>
        </View>
      </View>

      {item.daysRemaining && item.daysRemaining > 0 && (
        <Text style={[styles.daysText, { color: colors.textSecondary }]}>
          {item.daysRemaining} day{item.daysRemaining !== 1 ? 's' : ''} until deadline
        </Text>
      )}
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8 }]}>
        <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <View style={{ width: 30 }} />
      </View>

      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          style={[
            styles.tab,
            {
              borderBottomColor: activeTab === 'budget' ? colors.primary : 'transparent',
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => switchTab('budget')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'budget' ? colors.primary : colors.textSecondary },
            ]}
          >
            Budgets
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            {
              borderBottomColor: activeTab === 'goals' ? colors.primary : 'transparent',
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => switchTab('goals')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'goals' ? colors.primary : colors.textSecondary },
            ]}
          >
            Goals
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flexDirection: 'row', width: SCREEN_WIDTH * 2, height: '100%' }, animatedStyle]}>
          {/* Budget Tab Content */}
          <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
            <ScrollView
              style={styles.content}
              scrollEventThrottle={400}
              showsVerticalScrollIndicator={true}
            >
              {loading ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
                </View>
              ) : budgets.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No budgets yet
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Track your spending by setting category budgets
                  </Text>
                  <Pressable
                    onPress={() => router.push('/budgets/create')}
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.createButtonText, { color: colors.background }]}>
                      Create Your First Budget
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Financial Summary Card */}
                  <FinancialSummaryCard
                    budgets={budgets}
                    goals={[]}
                    colors={colors}
                    defaultCurrency={defaultCurrency}
                    formatCurrency={formatCurrency}
                    type="budget"
                  />

                  {/* Budget Alerts */}
                  <BudgetAlertBanner 
                    budgets={budgets} 
                    colors={colors}
                    defaultCurrency={defaultCurrency}
                    formatCurrency={formatCurrency}
                  />

                  {/* Budget Dashboard Summary */}
                  <View style={[styles.dashboardCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.dashboardTitle, { color: colors.textPrimary }]}>
                      Budget Status
                    </Text>
                    <View style={styles.dashboardStats}>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.textPrimary }]}>
                          {budgets.length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          Total
                        </Text>
                      </View>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.danger }]}>
                          {budgets.filter(b => b.isOverBudget).length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          Over
                        </Text>
                      </View>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.primary }]}>
                          {budgets.filter(b => !b.isOverBudget && (b.percentageUsed || 0) > 75).length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          Warning
                        </Text>
                      </View>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.success }]}>
                          {budgets.filter(b => !b.isOverBudget && (b.percentageUsed || 0) <= 75).length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          On Track
                        </Text>
                      </View>
                    </View>
                  </View>

                  {budgets.map(renderBudgetItem)}
                  <Pressable
                    onPress={() => router.push('/budgets/create')}
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.addButtonText, { color: colors.background }]}>
                      + Add Budget
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>

          {/* Goals Tab Content */}
          <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
            <ScrollView
              style={styles.content}
              scrollEventThrottle={400}
              showsVerticalScrollIndicator={true}
            >
              {loading ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
                </View>
              ) : goals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No goals yet
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Set savings goals and track your progress
                  </Text>
                  <Pressable
                    onPress={() => router.push('/goals/create')}
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.createButtonText, { color: colors.background }]}>
                      Create Your First Goal
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Financial Summary Card */}
                  <FinancialSummaryCard
                    budgets={[]}
                    goals={goals}
                    colors={colors}
                    defaultCurrency={defaultCurrency}
                    formatCurrency={formatCurrency}
                    type="goal"
                  />

                  {/* Goal Alerts */}
                  <GoalAlertBanner 
                    goals={goals} 
                    colors={colors}
                    defaultCurrency={defaultCurrency}
                    formatCurrency={formatCurrency}
                  />

                  {/* Goals Dashboard Summary */}
                  <View style={[styles.dashboardCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.dashboardTitle, { color: colors.textPrimary }]}>
                      Goal Status
                    </Text>
                    <View style={styles.dashboardStats}>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.textPrimary }]}>
                          {goals.length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          Total
                        </Text>
                      </View>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.success }]}>
                          {goals.filter(g => (g.progressPercentage || 0) >= 100).length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          Achieved
                        </Text>
                      </View>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.success }]}>
                          {goals.filter(g => g.onTrack && (g.progressPercentage || 0) < 100).length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          On Track
                        </Text>
                      </View>
                      <View style={styles.dashboardStat}>
                        <Text style={[styles.dashboardStatValue, { color: colors.primary }]}>
                          {goals.filter(g => !g.onTrack && (g.progressPercentage || 0) < 100).length}
                        </Text>
                        <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>
                          Behind
                        </Text>
                      </View>
                    </View>
                  </View>

                  {goals.map(renderGoalItem)}
                  <Pressable
                    onPress={() => router.push('/goals/create')}
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.addButtonText, { color: colors.background }]}>
                      + Add Goal
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </GestureDetector>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
    paddingTop: 20,
  },
  categoryCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  categorySubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
  deleteButton: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  daysText: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
  },
  paceIndicator: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  paceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  milestoneBadge: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  dashboardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dashboardStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dashboardStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  dashboardStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
