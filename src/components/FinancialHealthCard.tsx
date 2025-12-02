import React from 'react';
import { View, Text } from 'react-native';
import { FinancialHealthScore } from '../lib/insights/analyticsInsights';
import AnimatedProgressBar from './charts/AnimatedProgressBar';

interface FinancialHealthCardProps {
  healthScore: FinancialHealthScore;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  primaryColor: string;
}

export default function FinancialHealthCard({
  healthScore,
  textColor,
  backgroundColor,
  borderColor,
  primaryColor,
}: FinancialHealthCardProps) {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return '#27AE60';
      case 'Good':
        return '#3498DB';
      case 'Fair':
        return '#F39C12';
      case 'Poor':
        return '#E74C3C';
      default:
        return textColor;
    }
  };

  const getRatingEmoji = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return '🌟';
      case 'Good':
        return '👍';
      case 'Fair':
        return '😐';
      case 'Poor':
        return '😟';
      default:
        return '📊';
    }
  };

  const ratingColor = getRatingColor(healthScore.rating);

  return (
    <View
      style={{
        backgroundColor,
        borderWidth: 1,
        borderColor,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 48, marginBottom: 8 }}>
          {getRatingEmoji(healthScore.rating)}
        </Text>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
          Financial Health Score
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={{
              color: ratingColor,
              fontSize: 48,
              fontWeight: '800',
            }}
          >
            {healthScore.score}
          </Text>
          <Text style={{ color: textColor, fontSize: 20, marginLeft: 4, opacity: 0.7 }}>
            /100
          </Text>
        </View>
        <Text style={{ color: ratingColor, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
          {healthScore.rating}
        </Text>
      </View>

      <View style={{ marginTop: 8 }}>
        <Text style={{ color: textColor, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
          Score Breakdown
        </Text>

        <View style={{ gap: 16 }}>
          <View>
            <AnimatedProgressBar
              progress={(healthScore.factors.savingsRate / 30) * 100}
              label="Savings Rate"
              value={`${healthScore.factors.savingsRate}/30`}
              color={primaryColor}
              backgroundColor={borderColor}
              textColor={textColor}
              height={6}
            />
          </View>

          <View>
            <AnimatedProgressBar
              progress={(healthScore.factors.spendingConsistency / 25) * 100}
              label="Spending Consistency"
              value={`${healthScore.factors.spendingConsistency}/25`}
              color={primaryColor}
              backgroundColor={borderColor}
              textColor={textColor}
              height={6}
            />
          </View>

          <View>
            <AnimatedProgressBar
              progress={(healthScore.factors.budgetAdherence / 25) * 100}
              label="Budget Adherence"
              value={`${healthScore.factors.budgetAdherence}/25`}
              color={primaryColor}
              backgroundColor={borderColor}
              textColor={textColor}
              height={6}
            />
          </View>

          <View>
            <AnimatedProgressBar
              progress={(healthScore.factors.incomeStability / 20) * 100}
              label="Income Stability"
              value={`${healthScore.factors.incomeStability}/20`}
              color={primaryColor}
              backgroundColor={borderColor}
              textColor={textColor}
              height={6}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
