import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SpendingInsight } from '../lib/insights/analyticsInsights';

interface InsightCardProps {
  insight: SpendingInsight;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

function InsightCard({ insight, textColor, backgroundColor, borderColor }: InsightCardProps) {
  const getColorForType = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning':
        return '#E74C3C';
      case 'success':
        return '#27AE60';
      case 'info':
        return '#3498DB';
      case 'tip':
        return '#F39C12';
      default:
        return textColor;
    }
  };

  const accentColor = getColorForType(insight.type);

  return (
    <View
      style={{
        backgroundColor,
        borderWidth: 1,
        borderColor,
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 24, marginRight: 8 }}>{insight.icon}</Text>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '700', flex: 1 }}>
          {insight.title}
        </Text>
      </View>
      <Text style={{ color: textColor, fontSize: 14, lineHeight: 20, opacity: 0.9 }}>
        {insight.message}
      </Text>
    </View>
  );
}

interface InsightsSectionProps {
  insights: SpendingInsight[];
  title: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

export default function InsightsSection({
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
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: textColor, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
        {title}
      </Text>
      {insights.map((insight, index) => (
        <InsightCard
          key={`${insight.title}-${index}`}
          insight={insight}
          textColor={textColor}
          backgroundColor={backgroundColor}
          borderColor={borderColor}
        />
      ))}
    </View>
  );
}
