import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';

export default function SecuritySettings() {
  const { themeMode, biometricEnabled, setBiometricEnabled } = useSettings();
  const t = theme(themeMode);

  const toggleBiometric = async (v: boolean) => {
    if (v) {
      const supported = await LocalAuthentication.hasHardwareAsync();
      if (supported) {
        const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric lock' });
        if (res.success) setBiometricEnabled(true);
      }
    } else {
      setBiometricEnabled(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Security</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ color: t.textSecondary }}>Biometric Lock</Text>
        <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
      </View>
    </ScrollView>
  );
}
