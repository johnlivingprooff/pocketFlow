import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface Props {
  todaySpending: number;
  monthIncome: number;
  monthExpense: number;
  ratio: number; // income vs expense ratio
  mode?: 'light' | 'dark';
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  card: { borderWidth: 1, padding: 12, borderRadius: 10, minWidth: 80 },
  label: { fontSize: 12 },
  value: { fontWeight: '700' },
});

export const AnalyticsSummary = memo(function AnalyticsSummary({ todaySpending, monthIncome, monthExpense, ratio, mode = 'light' }: Props) {
  const t = theme(mode);
  // Hoisted array (was inline literal → new refs per render, breaking memo downstream)
  const cards = useMemo(
    () => [
      { label: 'Today', value: todaySpending },
      { label: 'Income', value: monthIncome },
      { label: 'Expense', value: monthExpense },
      { label: 'Ratio', value: ratio },
    ],
    [todaySpending, monthIncome, monthExpense, ratio]
  );
  return (
    <View style={styles.row}>
      {cards.map((c) => (
        <View key={c.label} style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.label, { color: t.textSecondary }]}>{c.label}</Text>
          <Text style={[styles.value, { color: t.textPrimary }]}>{c.value}</Text>
        </View>
      ))}
    </View>
  );
});
