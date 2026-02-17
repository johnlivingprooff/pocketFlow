import React, { useMemo, lazy, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { BudgetWithMetrics, GoalWithMetrics } from '@/types/goal';
import { theme } from '../theme/theme';
import { useSettings } from '../store/useStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatShortDate } from '../utils/date';
import { SkeletonCard } from './Skeleton';

interface HomeSummaryCardProps {
    type: 'budget' | 'goal';
    data: (BudgetWithMetrics | GoalWithMetrics)[];
    isLoading: boolean;
    hideBalances: boolean;
    colors: ReturnType<typeof theme>;
}

export const HomeSummaryWidget = React.memo(function HomeSummaryWidgetComponent({ type, data, isLoading, hideBalances, colors }: HomeSummaryCardProps) {
    const router = useRouter();
    const { defaultCurrency } = useSettings();

    const [pickerVisible, setPickerVisible] = React.useState(false);
    const [selectedId, setSelectedId] = React.useState<number | 'overview'>('overview');

    const metrics = useMemo(() => {
        if (!data.length) return null;

        if (type === 'budget') {
            const budgets = data as BudgetWithMetrics[];
            const totalLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
            const totalSpent = budgets.reduce((sum, b) => sum + b.currentSpending, 0);
            const progress = Math.min(100, (totalSpent / totalLimit) * 100);
            const isOver = totalSpent > totalLimit;

            return {
                label1: 'CONSUMED',
                value1: totalSpent,
                label2: 'BUDGET',
                value2: totalLimit,
                progress,
                status: `${progress.toFixed(0)}% Used`,
                statusColor: isOver ? colors.danger : progress > 85 ? colors.warning : colors.success,
                isOver
            };
        } else {
            const goals = data as GoalWithMetrics[];
            const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
            const totalSaved = goals.reduce((sum, g) => sum + g.currentProgress, 0);
            const progress = Math.min(100, (totalSaved / totalTarget) * 100);
            const onTrackCount = goals.filter(g => g.onTrack).length;

            return {
                label1: 'SAVED',
                value1: totalSaved,
                label2: 'TARGET',
                value2: totalTarget,
                progress,
                status: `${onTrackCount}/${goals.length} On Track`,
                statusColor: onTrackCount === goals.length ? colors.success : colors.warning,
                isOver: false
            };
        }
    }, [data, type, colors]);

    const currentItem = React.useMemo(() => {
        if (selectedId === 'overview') return null;
        return data.find(item => item.id === selectedId) || null;
    }, [selectedId, data]);

    if (isLoading) {
        return (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
                <SkeletonCard 
                    colors={colors} 
                    lines={2} 
                    showHeader={true}
                    showFooter={true}
                />
            </View>
        );
    }

    const options = [
        { label: 'Overview', id: 'overview' as const },
        ...data.map(item => ({ label: item.name, id: item.id }))
    ];

    const currentLabel = selectedId === 'overview' ? 'Overview' : data.find(i => i.id === selectedId)?.name || 'Overview';

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={[styles.selectorInline, { backgroundColor: colors.background + 'A0', borderColor: colors.border }]}
                onPress={() => setPickerVisible(true)}
            >
                <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: '800', maxWidth: 140 }} numberOfLines={1}>
                    {type.toUpperCase()}: {currentLabel.toUpperCase()}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 8, marginLeft: 6 }}>▼</Text>
            </TouchableOpacity>

            {selectedId === 'overview' ? (
                <Text style={{ color: metrics?.statusColor, fontWeight: '800', fontSize: 10 }}>
                    {metrics?.status}
                </Text>
            ) : (
                <Text style={{
                    color: type === 'budget'
                        ? ((currentItem as BudgetWithMetrics)?.isOverBudget ? colors.danger : colors.success)
                        : ((currentItem as GoalWithMetrics)?.onTrack ? colors.success : colors.warning),
                    fontWeight: '800',
                    fontSize: 10
                }}>
                    {type === 'budget'
                        ? `${(currentItem as BudgetWithMetrics)?.percentageUsed?.toFixed(0)}% Used`
                        : (currentItem as GoalWithMetrics)?.onTrack ? 'On Track' : 'Behind'}
                </Text>
            )}
        </View>
    );

    const renderContent = () => {
        if (!data.length) {
            return (
                <TouchableOpacity
                    onPress={() => router.push(type === 'budget' ? '/(tabs)/budget' : '/goals/create')}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                >
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No active {type}s</Text>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4 }}>Set up Now ›</Text>
                </TouchableOpacity>
            );
        }

        const displayProgress = selectedId === 'overview'
            ? metrics?.progress || 0
            : type === 'budget'
                ? (currentItem as BudgetWithMetrics)?.percentageUsed || 0
                : (currentItem as GoalWithMetrics)?.progressPercentage || 0;

        const val1 = selectedId === 'overview'
            ? metrics?.value1 || 0
            : type === 'budget'
                ? (currentItem as BudgetWithMetrics)?.currentSpending || 0
                : (currentItem as GoalWithMetrics)?.currentProgress || 0;

        const val2 = selectedId === 'overview'
            ? metrics?.value2 || 0
            : type === 'budget'
                ? (currentItem as BudgetWithMetrics)?.limitAmount || 0
                : (currentItem as GoalWithMetrics)?.targetAmount || 1;

        const label1 = selectedId === 'overview' ? metrics?.label1 : (type === 'budget' ? 'SPENT' : 'SAVED');
        const label2 = selectedId === 'overview' ? metrics?.label2 : (type === 'budget' ? 'LIMIT' : 'TARGET');

        const barColor = selectedId === 'overview'
            ? metrics?.statusColor
            : type === 'budget'
                ? ((currentItem as BudgetWithMetrics)?.isOverBudget ? colors.danger : displayProgress > 85 ? colors.warning : colors.success)
                : ((currentItem as GoalWithMetrics)?.currentProgress >= (currentItem as GoalWithMetrics)?.targetAmount ? colors.success : colors.primary);

        return (
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
                {renderHeader()}

                <View style={styles.progressBarContainer}>
                    <View
                        style={[styles.progressBar, {
                            width: `${Math.min(100, displayProgress)}%`,
                            backgroundColor: barColor,
                        }]}
                    />
                </View>

                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerLabel}>{label1}</Text>
                        <Text style={[styles.footerValue, { color: colors.textPrimary }]}>
                            {hideBalances ? '***' : formatCurrency(val1, defaultCurrency)}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.footerLabel}>{label2}</Text>
                        <Text style={[styles.footerValue, { color: colors.textPrimary }]}>
                            {hideBalances ? '***' : formatCurrency(val2, defaultCurrency)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {renderContent()}
            </View>

            <Modal
                visible={pickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={() => {
                                        setSelectedId(item.id);
                                        setPickerVisible(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{
                                            color: selectedId === item.id ? colors.primary : colors.textPrimary,
                                            fontWeight: selectedId === item.id ? '800' : '600'
                                        }}>
                                            {item.label}
                                        </Text>
                                        {selectedId === item.id && (
                                            <Text style={{ color: colors.primary }}>✓</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
});

export const FinancialHealthWidget = HomeSummaryWidget;

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        paddingTop: 12,
        height: 125,
        justifyContent: 'space-between'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    selectorInline: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#8882',
        borderRadius: 4,
        overflow: 'hidden',
        marginVertical: 10,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLabel: {
        fontSize: 9,
        fontWeight: '700',
        opacity: 0.6,
        color: '#888',
        marginBottom: 2,
    },
    footerValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 24,
        borderWidth: 1,
        maxHeight: '60%',
        padding: 8,
    },
    option: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#8881',
    }
});
