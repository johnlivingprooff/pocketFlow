import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SpendingInsight } from '../lib/insights/analyticsInsights';

interface InsightCardProps {
  insight: SpendingInsight;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

// Hoisted map (was switch recreated per card per render)
const ACCENT_COLORS: Record<SpendingInsight['type'], string> = {
  warning: '#E74C3C',
  success: '#27AE60',
  info: '#3498DB',
  tip: '#F39C12',
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 24, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  message: { fontSize: 14, lineHeight: 20, opacity: 0.9 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});

const InsightCard = memo(function InsightCard({ insight, textColor, backgroundColor, borderColor }: InsightCardProps) {
  const accentColor = ACCENT_COLORS[insight.type] ?? textColor;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor, borderLeftColor: accentColor },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{insight.icon}</Text>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          {insight.title}
        </Text>
      </View>
      <Text style={[styles.message, { color: textColor }]}>
        {insight.message}
      </Text>
    </View>
  );
});

interface InsightsSectionProps {
  insights: SpendingInsight[];
  title: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

export default memo(function InsightsSection({
  insights,
  title,
  textColor,
  backgroundColor,
  borderColor,
}: InsightsSectionProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        {title}
      </Text>
      {insights.map((insight) => (
        <InsightCard
          key={insight.title}
          insight={insight}
          textColor={textColor}
          backgroundColor={backgroundColor}
          borderColor={borderColor}
        />
      ))}
    </View>
  );
});
