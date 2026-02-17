import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Dimensions, RefreshControl } from 'react-native';
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
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/ThemedAlert';
import { EmptyBudgetIcon, EmptyGoalIcon, CheckCircleIcon, AlertCircleIcon, TrendUpIcon } from '@/assets/icons/BudgetGoalIcons';
import { PlusIcon } from '@/assets/icons/PlusIcon';
import { SettingsIcon } from '@/assets/icons/SettingsIcon'; // Using Settings as a placeholder if Chevron is missing, or just check what we have
import { ConfettiCelebration } from '@/components/ConfettiCelebration';

type TabType = 'budget' | 'goals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

/**
 * Returns an emoji badge for goal progress milestones
 * @param progressPercentage - Goal progress percentage (0-100+)
 * @returns Emoji badge or null if no milestone reached
 */
function getMilestoneBadge(progressPercentage: number): string | null {
  if (progressPercentage >= 100) return '🎉'; // Goal achieved!
  if (progressPercentage >= 75) return '🔥';  // Almost there!
  if (progressPercentage >= 50) return '💪';  // Halfway milestone
  if (progressPercentage >= 25) return '🌱';  // Early progress
  return null; // No milestone yet
}

export default function BudgetGoalsScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const colors = theme(themeMode, systemColorScheme || 'light');
  const { alertConfig, showErrorAlert, showRetryAlert, showConfirmAlert, showSuccessAlert, dismissAlert, setAlertConfig } = useAlert();
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [budgets, setBudgets] = useState<BudgetWithMetrics[]>([]);
  const [goals, setGoals] = useState<GoalWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const celebratedGoalIds = useRef<Set<number>>(new Set());

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

      // Small delay to allow recalculateBudgetSpending/recalculateGoalProgress write queue to complete
      // This ensures we don't get stale currentSpending/currentProgress values after transactions or budget/goal creation
      await new Promise(resolve => setTimeout(resolve, 150));

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
      const validGoals = goalsWithMetrics.filter((g): g is GoalWithMetrics => g !== null);
      setGoals(validGoals);
      
      // Check for newly achieved goals (100%) and trigger confetti
      const newlyAchieved = validGoals.filter(g => 
        (g.progressPercentage || 0) >= 100 && 
        !celebratedGoalIds.current.has(g.id!)
      );
      
      if (newlyAchieved.length > 0) {
        newlyAchieved.forEach(g => celebratedGoalIds.current.add(g.id!));
        setShowConfetti(true);
      }
    } catch (err: any) {
      logError('Failed to load budgets/goals data:', { error: err });
      showRetryAlert(
        'Error', 
        'Failed to load budgets and goals.\n\nWould you like to try again?',
        loadData
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteBudget = (budgetId: number) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Budget',
      message: 'Are you sure you want to delete this budget?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(budgetId);
              loadData();
              showSuccessAlert('Success', 'Budget deleted');
            } catch (err: any) {
              logError('Failed to delete budget:', { error: err });
              showErrorAlert('Error', 'Failed to delete budget');
            }
          },
        },
      ],
    });
  };

  const handleDeleteGoal = (goalId: number) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Goal',
      message: 'Are you sure you want to delete this goal?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goalId);
              loadData();
              showSuccessAlert('Success', 'Goal deleted');
            } catch (err: any) {
              logError('Failed to delete goal:', { error: err });
              showErrorAlert('Error', 'Failed to delete goal');
            }
          },
        },
      ],
    });
  };

  const handleViewBudget = (budgetId: number) => {
    router.push(`/budgets/${budgetId}`);
  };

  const handleCreateBudget = () => {
    router.push('/budgets/create');
  };

  const handleCreateGoal = () => {
    router.push('/goals/create');
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
    .failOffsetY([-20, 20])  // Increased from 10 to 20 - more tolerant of vertical scrolling
    .activeOffsetX([-15, 15])  // Increased from 10 to 15 - require more horizontal movement to activate
    .onUpdate((e) => {
      // Only allow horizontal swiping if the gesture is predominantly horizontal
      // This prevents conflicts with vertical scrolling/pull-to-refresh
      const isHorizontalGesture = Math.abs(e.translationX) > Math.abs(e.translationY) * 1.5 && Math.abs(e.translationX) > 30;

      if (!isHorizontalGesture) {
        return; // Let vertical gestures (like pull-to-refresh) pass through
      }

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
      // Only process horizontal swipe if it was a horizontal gesture
      const isHorizontalGesture = Math.abs(e.translationX) > Math.abs(e.translationY) * 1.5 && Math.abs(e.translationX) > 30;

      if (!isHorizontalGesture) {
        return; // Don't interfere with vertical gestures
      }

      const currentOffset = activeTab === 'budget' ? 0 : -SCREEN_WIDTH;
      const finalPosition = currentOffset + e.translationX;

      // Determine which tab to snap to based on position and velocity
      // Increased velocity threshold from 500 to 800 for more deliberate swipes
      const shouldSwitchToGoals =
        finalPosition < -SCREEN_WIDTH / 2 ||
        (e.velocityX < -800 && activeTab === 'budget');
      const shouldSwitchToBudget =
        finalPosition > -SCREEN_WIDTH / 2 ||
        (e.velocityX > 800 && activeTab === 'goals');

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

  const renderBudgetItem = (item: BudgetWithMetrics) => {
    // Determine status
    let statusText = 'On Track';
    let statusColor = colors.success;
    let statusBgColor = colors.success + '20';

    if (item.isOverBudget) {
      statusText = 'Over Budget';
      statusColor = colors.danger;
      statusBgColor = colors.danger + '20';
    } else if ((item.percentageUsed || 0) >= 85) {
      statusText = 'Warning';
      statusColor = colors.warning;
      statusBgColor = colors.warning + '20';
    }

    return (
      <View key={item.id} style={[styles.categoryCard, { backgroundColor: colors.card }]}>
        {/* Header with name and status badge */}
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
          <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(item.percentageUsed || 0, 100)}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        {/* Budget Info */}
        <View style={styles.budgetInfo}>
          <View>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>SPENT</Text>
            <Text style={[styles.budgetValue, { color: item.isOverBudget ? colors.danger : colors.textPrimary }]}>
              {formatCurrency(item.currentSpending, defaultCurrency)}
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.percentageText, { color: statusColor }]}>
              {item.percentageUsed?.toFixed(0) || '0'}%
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>REMAINING</Text>
            <Text style={[styles.budgetValue, { color: item.isOverBudget ? colors.danger : colors.success }]}>
              {formatCurrency(Math.abs(item.remainingBalance), defaultCurrency)}
            </Text>
          </View>
        </View>

        {/* Footer with limit and details */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>
              Limit: {formatCurrency(item.limitAmount, defaultCurrency)}
            </Text>
            {item.daysRemaining !== undefined && item.daysRemaining > 0 && (
              <Text style={[styles.daysText, { color: colors.textSecondary }]}>
                {item.daysRemaining} day{item.daysRemaining !== 1 ? 's' : ''} left •
                Avg: {formatCurrency(item.averageDailySpend, defaultCurrency)}/day
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <Pressable onPress={() => handleViewBudget(item.id!)} hitSlop={8}>
              <Text style={[styles.detailsLink, { color: colors.primary }]}>Details ›</Text>
            </Pressable>
            <Pressable onPress={() => handleDeleteBudget(item.id!)} hitSlop={12}>
              <Text style={[styles.deleteButton, { color: colors.textTertiary }]}>✕</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderGoalItem = (item: GoalWithMetrics) => {
    // Determine status
    let statusText = 'On Track';
    let statusColor = colors.primary;
    let statusBgColor = colors.primary + '20';

    if ((item.progressPercentage || 0) >= 100) {
      statusText = 'Achieved';
      statusColor = colors.success;
      statusBgColor = colors.success + '20';
    } else if (item.daysRemaining && item.daysRemaining < 0) {
      statusText = 'Overdue';
      statusColor = colors.danger;
      statusBgColor = colors.danger + '20';
    } else if (!item.onTrack) {
      statusText = 'Behind';
      statusColor = colors.warning;
      statusBgColor = colors.warning + '20';
    }

    const badge = getMilestoneBadge(item.progressPercentage || 0);

    return (
      <View key={item.id} style={[styles.categoryCard, { backgroundColor: colors.card }]}>
        {/* Header with name, milestone badge, and status */}
        <View style={styles.categoryHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                {item.name}
              </Text>
              {badge && <Text style={styles.milestoneBadge}>{badge}</Text>}
            </View>
            <Text style={[styles.categorySubtext, { color: colors.textSecondary }]}>
              Target: {formatCurrency(item.targetAmount, defaultCurrency)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(item.progressPercentage || 0, 100)}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        {/* Goal Info */}
        <View style={styles.budgetInfo}>
          <View>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>PROGRESS</Text>
            <Text style={[styles.budgetValue, { color: colors.textPrimary }]}>
              {formatCurrency(item.currentProgress, defaultCurrency)}
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.percentageText, { color: statusColor }]}>
              {item.progressPercentage?.toFixed(0) || '0'}%
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>MONTHLY</Text>
            <Text style={[styles.budgetValue, { color: colors.textPrimary }]}>
              {formatCurrency(item.monthlyRequired, defaultCurrency)}
            </Text>
          </View>
        </View>

        {/* Footer with deadline and details */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            {item.daysRemaining && item.daysRemaining > 0 && (
              <Text style={[styles.daysText, { color: colors.textSecondary }]}>
                {item.daysRemaining} day{item.daysRemaining !== 1 ? 's' : ''} until deadline
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <Pressable onPress={() => handleEditGoal(item.id!)} hitSlop={8}>
              <Text style={[styles.detailsLink, { color: colors.primary }]}>Details ›</Text>
            </Pressable>
            <Pressable onPress={() => handleDeleteGoal(item.id!)} hitSlop={12}>
              <Text style={[styles.deleteButton, { color: colors.textTertiary }]}>✕</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8 }]}>
        <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={12} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
          <Text style={[styles.backText, { color: colors.primary }]}>Settings</Text>
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Planning</Text>
        <View style={{ width: 44 }} />
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
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={loadData}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
              >
                {loading ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
                  </View>
                ) : budgets.length === 0 ? (
                  <View style={styles.emptyState}>
                    <EmptyBudgetIcon size={80} color={colors.textTertiary} />
                    <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                      No budgets yet
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                      Set spending limits for categories like groceries, dining, or entertainment to stay on track
                    </Text>
                    <View style={styles.emptyBenefits}>
                      <View style={styles.benefitItem}>
                        <CheckCircleIcon size={16} color={colors.success} />
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Track real-time spending</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <CheckCircleIcon size={16} color={colors.success} />
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Get alerts when limits are reached</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <CheckCircleIcon size={16} color={colors.success} />
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Weekly or monthly periods</Text>
                      </View>
                    </View>
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
                    <View style={[styles.dashboardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.dashboardTitle, { color: colors.textPrimary }]}>
                        Budget Overview
                      </Text>
                      <View style={styles.dashboardGrid}>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.background }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>TOTAL</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.textPrimary }]}>{budgets.length}</Text>
                        </View>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.success + '15' }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.success }]}>ON TRACK</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.success }]}>
                            {budgets.filter(b => !b.isOverBudget && (b.percentageUsed || 0) <= 75).length}
                          </Text>
                        </View>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.warning + '15' }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.warning }]}>WARNING</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.warning }]}>
                            {budgets.filter(b => !b.isOverBudget && (b.percentageUsed || 0) > 75).length}
                          </Text>
                        </View>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.danger + '15' }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.danger }]}>OVER</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.danger }]}>
                            {budgets.filter(b => b.isOverBudget).length}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {budgets.map(renderBudgetItem)}
                    <View style={{ height: 100 }} />
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
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={loadData}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
              >
                {loading ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
                  </View>
                ) : goals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <EmptyGoalIcon size={80} color={colors.textTertiary} />
                    <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                      No goals yet
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                      Set savings goals like emergency funds, vacations, or big purchases to build financial security
                    </Text>
                    <View style={styles.emptyBenefits}>
                      <View style={styles.benefitItem}>
                        <CheckCircleIcon size={16} color={colors.success} />
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Track progress automatically</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <CheckCircleIcon size={16} color={colors.success} />
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>See required monthly savings</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <CheckCircleIcon size={16} color={colors.success} />
                        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Stay motivated with milestones</Text>
                      </View>
                    </View>
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
                    <View style={[styles.dashboardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.dashboardTitle, { color: colors.textPrimary }]}>
                        Goal Overview
                      </Text>
                      <View style={styles.dashboardGrid}>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.background }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.textSecondary }]}>TOTAL</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.textPrimary }]}>{goals.length}</Text>
                        </View>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.success + '15' }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.success }]}>ACHIEVED</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.success }]}>
                            {goals.filter(g => (g.progressPercentage || 0) >= 100).length}
                          </Text>
                        </View>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.primary }]}>ON TRACK</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.primary }]}>
                            {goals.filter(g => g.onTrack && (g.progressPercentage || 0) < 100).length}
                          </Text>
                        </View>
                        <View style={[styles.dashboardStatCard, { backgroundColor: colors.warning + '15' }]}>
                          <Text style={[styles.dashboardStatLabel, { color: colors.warning }]}>BEHIND</Text>
                          <Text style={[styles.dashboardStatValue, { color: colors.warning }]}>
                            {goals.filter(g => !g.onTrack && (g.progressPercentage || 0) < 100).length}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {goals.map(renderGoalItem)}
                    <View style={{ height: 100 }} />
                  </>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

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

      {/* Floating Action Button */}
      {!loading && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={activeTab === 'budget' ? handleCreateBudget : handleCreateGoal}
        >
          <PlusIcon size={24} color={colors.background} />
        </Pressable>
      )}
      
      {/* Confetti Celebration for achieved goals */}
      <ConfettiCelebration 
        visible={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
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
    height: 56,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  categoryCard: {
    marginBottom: 16,
    marginHorizontal: 5,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  categorySubtext: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deleteButton: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.5,
  },
  progressContainer: {
    height: 12,
    borderRadius: 6,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  budgetLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  budgetValue: {
    fontSize: 15,
    fontWeight: '800',
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
    fontSize: 20,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  daysText: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailsLink: {
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBenefits: {
    alignSelf: 'stretch',
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500',
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
    marginHorizontal: 5,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dashboardStatCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  dashboardStatLabel: {
    fontSize: 10,
    fontWeight: '700',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
