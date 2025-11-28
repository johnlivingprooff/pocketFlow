import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { theme } from '../theme/theme';

interface Props {
  label: string;
  onPress: () => void;
  mode?: 'light' | 'dark';
}

export function AddButton({ label, onPress, mode = 'light' }: Props) {
  const t = theme(mode);
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        backgroundColor: t.accent,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}
