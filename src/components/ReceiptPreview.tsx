import React from 'react';
import { View, Image, Text, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

interface Props {
  uri?: string;
  mode?: 'light' | 'dark';
  onRemove?: () => void;
}

export function ReceiptPreview({ uri, mode = 'light', onRemove }: Props) {
  const t = theme(mode);
  if (!uri) {
    return <Text style={{ color: t.textSecondary }}>No receipt attached</Text>;
  }
  return (
    <View style={{ position: 'relative' }}>
      <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 8, overflow: 'hidden' }}>
        <Image source={{ uri }} style={{ width: 160, height: 160 }} />
      </View>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: t.danger,
            borderRadius: 12,
            width: 24,
            height: 24,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 20 }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
