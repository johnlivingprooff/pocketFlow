import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, biometricEnabled, setBiometricEnabled } = useSettings();
  const t = theme(themeMode);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>Settings</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ color: t.textSecondary }}>Dark Mode</Text>
        <Switch value={themeMode === 'dark'} onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ color: t.textSecondary }}>Biometric Lock</Text>
        <Switch value={biometricEnabled} onValueChange={(v) => setBiometricEnabled(v)} />
      </View>
    </ScrollView>
  );
}
