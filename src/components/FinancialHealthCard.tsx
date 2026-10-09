import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FinancialHealthScore } from '../lib/insights/analyticsInsights';
import AnimatedProgressBar from './charts/AnimatedProgressBar';

interface FinancialHealthCardProps {
  healthScore: FinancialHealthScore;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  primaryColor: string;
}

// Hoisted: previously recreated closures + inline style objects per render.
const RATING_COLORS: Record<string, string> = {
  Excellent: '#27AE60',
  Good: '#3498DB',
  Fair: '#F39C12',
  Poor: '#E74C3C',
};

const RATING_EMOJIS: Record<string, string> = {
  Excellent: '🌟',
  Good: '👍',
  Fair: '😐',
  Poor: '😟',
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontSize: 48, fontWeight: '800' },
  scoreSuffix: { fontSize: 20, marginLeft: 4, opacity: 0.7 },
  rating: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  breakdown: { marginTop: 8 },
  breakdownTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  bars: { gap: 16 },
});

export default memo(function FinancialHealthCard({
  healthScore,
  textColor,
  backgroundColor,
  borderColor,
  primaryColor,
}: FinancialHealthCardProps) {
  const ratingColor = RATING_COLORS[healthScore.rating] ?? textColor;
  const ratingEmoji = RATING_EMOJIS[healthScore.rating] ?? '📊';

  // Precompute progress/value strings once per factors object
  const bars = useMemo(
    () => [
      {
        key: 'savings',
        label: 'Savings Rate',
        progress: (healthScore.factors.savingsRate / 30) * 100,
        value: `${healthScore.factors.savingsRate}/30`,
      },
      {
        key: 'consistency',
        label: 'Spending Consistency',
        progress: (healthScore.factors.spendingConsistency / 25) * 100,
        value: `${healthScore.factors.spendingConsistency}/25`,
      },
      {
        key: 'adherence',
        label: 'Budget Adherence',
        progress: (healthScore.factors.budgetAdherence / 25) * 100,
        value: `${healthScore.factors.budgetAdherence}/25`,
      },
      {
        key: 'stability',
        label: 'Income Stability',
        progress: (healthScore.factors.incomeStability / 20) * 100,
        value: `${healthScore.factors.incomeStability}/20`,
      },
    ],
    [healthScore.factors]
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>
          {ratingEmoji}
        </Text>
        <Text style={[styles.title, { color: textColor }]}>
          Financial Health Score
        </Text>
        <View style={styles.scoreRow}>
          <Text
            style={[
              styles.score,
              { color: ratingColor },
            ]}
          >
            {healthScore.score}
          </Text>
          <Text style={[styles.scoreSuffix, { color: textColor }]}>
            /100
          </Text>
        </View>
        <Text style={[styles.rating, { color: ratingColor }]}>
          {healthScore.rating}
        </Text>
      </View>

      <View style={styles.breakdown}>
        <Text style={[styles.breakdownTitle, { color: textColor }]}>
          Score Breakdown
        </Text>

        <View style={styles.bars}>
          {bars.map((bar) => (
            <View key={bar.key}>
              <AnimatedProgressBar
                progress={bar.progress}
                label={bar.label}
                value={bar.value}
                color={primaryColor}
                backgroundColor={borderColor}
                textColor={textColor}
                height={6}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});
