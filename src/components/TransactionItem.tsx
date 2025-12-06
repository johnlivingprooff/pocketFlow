import React from 'react';
import { View, Text, Image } from 'react-native';
import { theme } from '../theme/theme';
import { Transaction } from '../types/transaction';
import { formatCurrency } from '../utils/formatCurrency';

interface Props {
  item: Transaction;
  currency: string;
  mode?: 'light' | 'dark';
}

export function TransactionItem({ item, currency, mode = 'light' }: Props) {
  const t = theme(mode);
  const color = item.type === 'income' ? t.income : t.expense;

  const getTransferLabel = () => {
    if (item.category !== 'Transfer') return item.category || 'Uncategorized';

    const notes = item.notes || '';
    if (item.type === 'expense') {
      const match = notes.match(/to ([^(]+)/i);
      if (match?.[1]) return `Transfer to ${match[1].trim()}`;
      return 'Transfer to wallet';
    }
    if (item.type === 'income') {
      const match = notes.match(/from ([^(]+)/i);
      if (match?.[1]) return `Transfer from ${match[1].trim()}`;
      return 'Transfer from wallet';
    }
    return 'Transfer';
  };

  const displayCategory = getTransferLabel();
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Text style={{ color }}>{item.type === 'income' ? '+' : '-'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textPrimary, fontWeight: '500' }}>{displayCategory}</Text>
        <Text style={{ color: t.textSecondary, fontSize: 12 }}>{new Date(item.date).toLocaleString()}</Text>
        {item.notes ? <Text style={{ color: t.textSecondary, fontSize: 12 }}>{item.notes}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color, fontWeight: '700' }}>{formatCurrency(item.amount, currency)}</Text>
        {item.receipt_uri ? <Image source={{ uri: item.receipt_uri }} style={{ width: 24, height: 24, marginTop: 6, borderRadius: 4 }} /> : null}
      </View>
    </View>
  );
}
