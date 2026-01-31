import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

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
  const size = 160; // Slightly smaller and more compact
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  const getRatingColors = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return ['#00C853', '#B2FF59'];
      case 'Good':
        return ['#2979FF', '#00E5FF'];
      case 'Fair':
        return ['#FF9100', '#FFD740'];
      case 'Poor':
        return ['#FF1744', '#FF5252'];
      default:
        return [primaryColor, primaryColor + '99'];
    }
  };

  const colors = getRatingColors(healthScore.rating);
  const progress = healthScore.score / 100;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <View style={[styles.container, { backgroundColor, borderColor: primaryColor + '20' }]}>
      <View style={styles.content}>
        <View style={styles.chartWrapper}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors[0]} />
                <Stop offset="100%" stopColor={colors[1]} />
              </LinearGradient>
            </Defs>
            {/* Track */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={primaryColor + '10'}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#grad)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>

          <View style={styles.scoreTextWrapper}>
            <Text style={[styles.scoreText, { color: colors[0] }]}>{healthScore.score}</Text>
            <Text style={[styles.scoreLabel, { color: textColor }]}>SCORE</Text>
          </View>
        </View>

        <View style={styles.infoWrapper}>
          <View>
            <Text style={[styles.ratingText, { color: colors[0] }]}>{healthScore.rating.toUpperCase()}</Text>
            <Text style={[styles.subtitle, { color: textColor }]}>Financial IQ</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.factorsGrid}>
            <View style={styles.factorItem}>
              <Text style={[styles.factorValue, { color: textColor }]}>{healthScore.factors.savingsRate}/30</Text>
              <Text style={[styles.factorLabel, { color: textColor }]}>Savings</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={[styles.factorValue, { color: textColor }]}>{healthScore.factors.budgetAdherence}/25</Text>
              <Text style={[styles.factorLabel, { color: textColor }]}>Budget</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={[styles.factorValue, { color: textColor }]}>{healthScore.factors.spendingConsistency}/25</Text>
              <Text style={[styles.factorLabel, { color: textColor }]}>Habits</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={[styles.factorValue, { color: textColor }]}>{healthScore.factors.incomeStability}/20</Text>
              <Text style={[styles.factorLabel, { color: textColor }]}>Stability</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  chartWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreTextWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.5,
    marginTop: -4,
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  factorItem: {
    width: '45%',
  },
  factorValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  factorLabel: {
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.5,
  }
});
