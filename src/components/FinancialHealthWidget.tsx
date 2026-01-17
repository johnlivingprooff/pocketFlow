import React, { useMemo, lazy, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BudgetWithMetrics, GoalWithMetrics } from '@/types/goal';
import { theme } from '../theme/theme';
import { useSettings } from '../store/useStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatShortDate } from '../utils/date';

interface FinancialHealthWidgetProps {
    budgets: BudgetWithMetrics[];
    goals: GoalWithMetrics[];
    isLoading: boolean;
    hideBalances: boolean;
    colors: ReturnType<typeof theme>;
}

const CARD_WIDTH = 300;

export const FinancialHealthWidget = React.memo(function FinancialHealthWidgetComponent({ budgets, goals, isLoading, hideBalances, colors }: FinancialHealthWidgetProps) {
    const router = useRouter();
    const { defaultCurrency } = useSettings();

    const budgetMetrics = useMemo(() => {
        if (!budgets.length) return null;

        const totalLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
        const totalSpent = budgets.reduce((sum, b) => sum + b.currentSpending, 0);
        const totalRemaining = Math.max(0, totalLimit - totalSpent);
        const progress = Math.min(100, (totalSpent / totalLimit) * 100);
        const isOver = totalSpent > totalLimit;

        return {
            totalLimit,
            totalSpent,
            totalRemaining,
            progress,
            isOver
        };
    }, [budgets]);

    const FinancialHealthSkeleton = () => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }]}>
            <View style={{ height: 14, width: 140, backgroundColor: colors.border, borderRadius: 4, marginBottom: 8, opacity: 0.5 }} />
            <View style={{ height: 32, width: '70%', backgroundColor: colors.border, borderRadius: 4, marginBottom: 12, opacity: 0.5 }} />
            <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: 12, opacity: 0.5 }} />
            <View style={{ height: 12, backgroundColor: colors.border, borderRadius: 4, opacity: 0.5 }} />
        </View>
    );

    if (isLoading) {
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                style={{ marginBottom: 20, marginTop: 4 }}
            >
                <FinancialHealthSkeleton />
            </ScrollView>
        );
    }

    const renderBudgetCard = () => {
        if (!budgetMetrics) {
            return (
                <TouchableOpacity
                    onPress={() => router.push('/budgets/index')}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH, justifyContent: 'center', alignItems: 'center' }]}
                >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 4 }}>Set Up Budget</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Track your spending limits</Text>
                </TouchableOpacity>
            );
        }

        return (
            <View
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }]}
            >
                <View style={styles.header}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>BUDGET OVERVIEW</Text>
                    <Text style={{ color: budgetMetrics.isOver ? colors.danger : colors.success, fontWeight: '700', fontSize: 12 }}>
                        {budgetMetrics.progress.toFixed(0)}% Used
                    </Text>
                </View>

                <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginBottom: 12 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>
                        {hideBalances ? '******' : formatCurrency(budgetMetrics.totalRemaining, defaultCurrency)}
                    </Text>
                    {!hideBalances && (
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                            left of {formatCurrency(budgetMetrics.totalLimit, defaultCurrency)}
                        </Text>
                    )}
                </View>

                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                    <View
                        style={{
                            height: '100%',
                            width: `${budgetMetrics.progress}%`,
                            backgroundColor: budgetMetrics.isOver ? colors.danger : budgetMetrics.progress > 85 ? colors.warning : colors.success,
                            borderRadius: 4
                        }}
                    />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Spent: <Text style={{ color: budgetMetrics.isOver ? colors.danger : colors.textPrimary }}>{hideBalances ? '***' : formatCurrency(budgetMetrics.totalSpent, defaultCurrency)}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/budget')}>
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Details ›</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderGoalCard = (goal: GoalWithMetrics) => {
        return (
            <View
                key={goal.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }]}
            >
                <View style={styles.header}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }} numberOfLines={1}>GOAL: {goal.name.toUpperCase()}</Text>
                    <Text style={{ color: goal.onTrack ? colors.success : colors.warning, fontWeight: '700', fontSize: 12 }}>
                        {goal.onTrack ? 'On Track' : 'Behind'}
                    </Text>
                </View>

                <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginBottom: 12 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>
                        {hideBalances ? '******' : formatCurrency(goal.currentProgress, defaultCurrency)}
                    </Text>
                    {!hideBalances && (
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                            of {formatCurrency(goal.targetAmount, defaultCurrency)}
                        </Text>
                    )}
                </View>

                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                    <View
                        style={{
                            height: '100%',
                            width: `${goal.progressPercentage}%`,
                            backgroundColor: goal.currentProgress >= goal.targetAmount ? colors.success : colors.primary,
                            borderRadius: 4
                        }}
                    />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Target: {formatShortDate(new Date(goal.targetDate))}
                    </Text>
                    <TouchableOpacity onPress={() => router.push(`/goals/${goal.id}`)}>
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Details ›</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            style={{ marginBottom: 20, marginTop: 4 }}
        >
            {renderBudgetCard()}
            {goals.map(renderGoalCard)}
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        height: 200, // Increased height to accommodate content
        justifyContent: 'space-between'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    }
});
