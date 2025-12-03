import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../theme/theme';
import { formatCurrency } from '../utils/formatCurrency';

interface Props {
  name: string;
  balance: number;
  currency: string;
  color?: string;
  mode?: 'light' | 'dark';
}

export function WalletCard({ name, balance, currency, color, mode = 'light' }: Props) {
  const t = theme(mode);
  return (
    <View
      style={{
        backgroundColor: t.card,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: t.border,
      }}
      accessibilityLabel={`Wallet ${name} with balance ${balance}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color || t.accent, marginRight: 8 }} />
        <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{name}</Text>
      </View>
      <Text style={{ color: t.textSecondary }}>{formatCurrency(balance, currency)}</Text>
    </View>
  );
}
