import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

interface FinancialHealthRingProps {
  healthScore: {
    score: number;
    rating: string;
    factors: {
      savingsRate: number;
      spendingConsistency: number;
      budgetAdherence: number;
      incomeStability: number;
    };
  };
  textColor: string;
  backgroundColor: string;
  primaryColor: string;
}

export default function FinancialHealthRing({
  healthScore,
  textColor,
  backgroundColor,
  primaryColor,
}: FinancialHealthRingProps) {
  const screenWidth = Dimensions.get('window').width;
  const size = Math.min(screenWidth * 0.6, 200);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

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
        return primaryColor;
    }
  };

  const ratingColor = getRatingColor(healthScore.rating);
  const progress = healthScore.score / 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
      }}
    >
      <View style={{ position: 'relative' }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`${ratingColor}20`}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ratingColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>

        {/* Center text */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: ratingColor,
              fontSize: 36,
              fontWeight: '800',
            }}
          >
            {healthScore.score}
          </Text>
          <Text
            style={{
              color: textColor,
              fontSize: 14,
              opacity: 0.7,
              marginTop: 2,
            }}
          >
            /100
          </Text>
          <Text
            style={{
              color: ratingColor,
              fontSize: 16,
              fontWeight: '700',
              marginTop: 4,
            }}
          >
            {healthScore.rating}
          </Text>
        </View>
      </View>

      {/* Factor breakdown */}
      <View style={{ marginTop: 20, width: '100%' }}>
        <Text style={{ color: textColor, fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center' }}>
          Score Breakdown
        </Text>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: textColor, fontSize: 12 }}>Savings Rate</Text>
            <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>
              {healthScore.factors.savingsRate}/30
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: textColor, fontSize: 12 }}>Spending Consistency</Text>
            <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>
              {healthScore.factors.spendingConsistency}/25
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: textColor, fontSize: 12 }}>Budget Adherence</Text>
            <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>
              {healthScore.factors.budgetAdherence}/25
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: textColor, fontSize: 12 }}>Income Stability</Text>
            <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>
              {healthScore.factors.incomeStability}/20
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}