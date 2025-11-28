import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { theme } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';

export default function Onboarding() {
  const { themeMode } = useSettings();
  const t = theme(themeMode);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: t.textPrimary, fontSize: 22, fontWeight: '800' }}>Welcome to pocketFlow</Text>
      <Text style={{ color: t.textSecondary, marginTop: 8 }}>Track wallets and transactions offline with receipts.</Text>
      <Text style={{ color: t.textSecondary, marginTop: 8 }}>Set your default currency in Settings.</Text>
    </ScrollView>
  );
}
