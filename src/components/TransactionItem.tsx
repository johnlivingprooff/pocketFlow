import React, { memo, useMemo } from 'react';
import { View, Text, Image } from 'react-native';
import { theme } from '../theme/theme';
import { Transaction } from '../types/transaction';
import { formatCurrency } from '../utils/formatCurrency';
import { getTransferLabel } from '../utils/transferLabel';

interface Props {
  item: Transaction;
  currency: string;
  mode?: 'light' | 'dark';
}

export const TransactionItem = memo(function TransactionItem({ item, currency, mode = 'light' }: Props) {
  // theme() is now memoized (stable ref per mode); no per-render allocation.
  const t = theme(mode);
  const color = item.type === 'income' ? t.income : t.expense;

  const displayCategory = getTransferLabel(item);
  // Avoid `new Date().toLocaleString()` (ICU) on every render of every row;
  // memoize per item.date value.
  const displayDate = useMemo(() => new Date(item.date).toLocaleString(), [item.date]);
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Text style={{ color, fontSize: 20, fontWeight: '700' }}>{item.type === 'income' ? '+' : '−'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textPrimary, fontWeight: '500' }}>{displayCategory}</Text>
        <Text style={{ color: t.textSecondary, fontSize: 12 }}>{displayDate}</Text>
        {item.notes ? <Text style={{ color: t.textSecondary, fontSize: 12 }}>{item.notes}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color, fontWeight: '700' }}>{formatCurrency(item.amount, currency)}</Text>
        {item.receipt_path ? <Image source={{ uri: item.receipt_path }} style={{ width: 24, height: 24, marginTop: 6, borderRadius: 4 }} /> : null}
      </View>
    </View>
  );
});

// Back-compat named export (same component, memoized)
export { TransactionItem as TransactionItemComponent };
