import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';

export default function CurrencySettings() {
  const { themeMode, defaultCurrency, setDefaultCurrency } = useSettings();
  const t = theme(themeMode);
  const [value, setValue] = useState(defaultCurrency);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
      <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Default Currency</Text>
      <TextInput value={value} onChangeText={setValue} onBlur={() => setDefaultCurrency(value)} style={{ borderWidth: 1, borderColor: t.border, color: t.textPrimary, padding: 10, borderRadius: 8, marginTop: 12 }} />
    </ScrollView>
  );
}
