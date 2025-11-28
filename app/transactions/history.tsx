import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { useTransactions } from '../../src/lib/hooks/useTransactions';
import { TransactionItem } from '../../src/components/TransactionItem';

export default function HistoryScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const { transactions } = useTransactions();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>History</Text>
      <View>
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} item={tx} currency={defaultCurrency} mode={themeMode} />
        ))}
      </View>
    </ScrollView>
  );
}
