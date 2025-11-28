import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../theme/theme';

interface Props {
  todaySpending: number;
  monthIncome: number;
  monthExpense: number;
  ratio: number; // income vs expense ratio
  mode?: 'light' | 'dark';
}

export function AnalyticsSummary({ todaySpending, monthIncome, monthExpense, ratio, mode = 'light' }: Props) {
  const t = theme(mode);
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {[{ label: 'Today', value: todaySpending }, { label: 'Income', value: monthIncome }, { label: 'Expense', value: monthExpense }, { label: 'Ratio', value: ratio }].map((c) => (
        <View key={c.label} style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1, padding: 12, borderRadius: 10, minWidth: 80 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12 }}>{c.label}</Text>
          <Text style={{ color: t.textPrimary, fontWeight: '700' }}>{c.value}</Text>
        </View>
      ))}
    </View>
  );
}
