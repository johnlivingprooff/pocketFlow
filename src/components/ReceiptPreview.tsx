import React from 'react';
import { View, Image, Text } from 'react-native';
import { theme } from '../theme/theme';

interface Props {
  uri?: string;
  mode?: 'light' | 'dark';
}

export function ReceiptPreview({ uri, mode = 'light' }: Props) {
  const t = theme(mode);
  if (!uri) {
    return <Text style={{ color: t.textSecondary }}>No receipt attached</Text>;
  }
  return (
    <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 8, overflow: 'hidden' }}>
      <Image source={{ uri }} style={{ width: 160, height: 160 }} />
    </View>
  );
}
