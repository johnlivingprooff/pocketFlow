import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../theme/theme';
import { formatCurrency } from '../utils/formatCurrency';
import { WalletType } from '../types/wallet';

interface Props {
  name: string;
  balance: number;
  currency: string;
  color?: string;
  mode?: 'light' | 'dark';
  type?: WalletType;
}

// Get icon and color for wallet type
const getWalletTypeStyle = (type?: WalletType) => {
  switch (type) {
    case 'Cash':
      return { icon: '💵', label: 'Cash', color: '#22C55E' };
    case 'Credit Card':
      return { icon: '💳', label: 'Credit', color: '#8B5CF6' };
    case 'Bank Account':
      return { icon: '🏦', label: 'Bank', color: '#3B82F6' };
    case 'Mobile Money':
      return { icon: '📱', label: 'Mobile', color: '#F59E0B' };
    default:
      return { icon: '💰', label: 'Wallet', color: '#6B7280' };
  }
};

export function WalletCard({ name, balance, currency, color, mode = 'light', type }: Props) {
  const t = theme(mode);
  const typeStyle = getWalletTypeStyle(type);
  
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
        <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600', flex: 1 }}>{name}</Text>
        {/* Wallet Type Badge */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: typeStyle.color + '20',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
        }}>
          <Text style={{ fontSize: 12, marginRight: 4 }}>{typeStyle.icon}</Text>
          <Text style={{ color: typeStyle.color, fontSize: 11, fontWeight: '700' }}>{typeStyle.label}</Text>
        </View>
      </View>
      <Text style={{ color: t.textSecondary }}>{formatCurrency(balance, currency)}</Text>
    </View>
  );
}
