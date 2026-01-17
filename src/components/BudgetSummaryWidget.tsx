import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BudgetWithMetrics } from '@/types/goal';
import { theme } from '../theme/theme';
import { useSettings } from '../store/useStore';
import { formatCurrency } from '../utils/formatCurrency';

interface BudgetSummaryWidgetProps {
    budgets: BudgetWithMetrics[];
    isLoading: boolean;
    colors: ReturnType<typeof theme>;
}

export function BudgetSummaryWidget({ budgets, isLoading, colors }: BudgetSummaryWidgetProps) {
    const router = useRouter();
    const { defaultCurrency } = useSettings();

    const metrics = useMemo(() => {
        if (!budgets.length) return null;

        const totalLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
        const totalSpent = budgets.reduce((sum, b) => sum + b.currentSpending, 0);
        const totalRemaining = Math.max(0, totalLimit - totalSpent);

        // Calculate simple days remaining for the current month/period
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const daysLeftInMonth = Math.max(1, endOfMonth.getDate() - today.getDate());

        const dailySafeSpend = totalRemaining / daysLeftInMonth;
        const progress = Math.min(100, (totalSpent / totalLimit) * 100);
        const isOver = totalSpent > totalLimit;

        return {
            totalLimit,
            totalSpent,
            totalRemaining,
            dailySafeSpend,
            progress,
            isOver
        };
    }, [budgets]);

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary }}>Loading budget data...</Text>
            </View>
        );
    }

    if (!metrics) {
        return (
            <TouchableOpacity
                onPress={() => router.push('/(tabs)/budget')}
                style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 20 }]}
            >
                <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 4 }}>Start Budgeting</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Tap to set up your first budget limits</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={() => router.push('/(tabs)/budget')}
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={styles.header}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>MONTHLY BUDGET LEFT</Text>
                <Text style={{ color: metrics.isOver ? colors.danger : colors.success, fontWeight: '700', fontSize: 12 }}>
                    {metrics.progress.toFixed(0)}% Used
                </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: '800' }}>
                    {formatCurrency(metrics.totalRemaining, defaultCurrency)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    / {formatCurrency(metrics.totalLimit, defaultCurrency)}
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
                <View
                    style={{
                        height: '100%',
                        width: `${metrics.progress}%`,
                        backgroundColor: metrics.isOver ? colors.danger : metrics.progress > 85 ? colors.warning : colors.success,
                        borderRadius: 4
                    }}
                />
            </View>

            <View style={styles.footer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ padding: 4, backgroundColor: colors.background, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 12 }}>📅</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        Safe to spend: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{formatCurrency(metrics.dailySafeSpend, defaultCurrency)}</Text> / day
                    </Text>
                </View>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Details ›</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
        marginHorizontal: 16, // Match main layout margin
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150, 0.1)',
    }
});
