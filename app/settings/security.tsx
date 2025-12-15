import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { checkBiometricAvailability, authenticateWithBiometrics } from '../../src/lib/services/biometricService';
import { clearDatabase } from '../../src/lib/db';

export default function SecuritySettings() {
  const router = useRouter();
  const { 
    themeMode, 
    biometricEnabled, 
    setBiometricEnabled,
    setBiometricSetupComplete,
    setLastAuthTime,
    resetSettings,
  } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const result = await checkBiometricAvailability();
    setBiometricAvailable(result.isAvailable);
    if (result.isAvailable) {
      setBiometricType(result.biometricType);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const availability = await checkBiometricAvailability();
      
      if (!availability.isAvailable) {
        Alert.alert(
          'Biometric Not Available',
          availability.error || 'Biometric authentication is not available.',
          [{ text: 'OK' }]
        );
        return;
      }

      const auth = await authenticateWithBiometrics('Authenticate to enable biometric lock');
      
      if (auth.success) {
        setBiometricEnabled(true);
        setBiometricSetupComplete(true);
        setLastAuthTime(Date.now());
        Alert.alert('Success', `${biometricType} has been enabled successfully.`);
      } else {
        Alert.alert('Failed', auth.error || 'Could not enable biometric lock.');
      }
    } else {
      Alert.alert(
        'Disable Biometric Lock',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => {
              setBiometricEnabled(false);
              setLastAuthTime(null);
            },
          },
        ]
      );
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your wallets, transactions, and categories. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearDatabase();
              resetSettings();
              // Close the app using native modules to restart fresh
              setTimeout(() => {
                try {
                  const { NativeModules } = require('react-native');
                  // Try Android exit
                  if (NativeModules.RNExitApp) {
                    NativeModules.RNExitApp.exitApp();
                  }
                  // Try iOS exit via native code
                  else if (NativeModules.ExitApp) {
                    NativeModules.ExitApp.exit();
                  }
                  // Fallback: navigate and clear router state
                  else {
                    router.replace('/');
                  }
                } catch (e) {
                  // If all else fails, just navigate back
                  router.replace('/');
                }
              }, 200);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleTestBiometric = async () => {
    const auth = await authenticateWithBiometrics('Test biometric authentication');
    if (auth.success) {
      Alert.alert('Success', 'Biometric authentication successful!');
    } else {
      Alert.alert('Failed', auth.error || 'Authentication failed.');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        {/* Header */}
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>
          Security Settings
        </Text>

      {/* Biometric Authentication */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
          AUTHENTICATION
        </Text>
        
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
          {/* Biometric Toggle */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                  {biometricType} Lock
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {biometricAvailable 
                    ? `Require ${biometricType} to open app` 
                    : 'Not available on this device'}
                </Text>
              </View>
              <Switch 
                value={biometricEnabled} 
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
              />
            </View>
          </View>

          {/* Test Biometric */}
          {biometricAvailable && (
            <TouchableOpacity 
              onPress={handleTestBiometric}
              style={{ padding: 16 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                    Test {biometricType}
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                    Verify authentication is working
                  </Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {biometricEnabled && (
          <View style={{ 
            marginTop: 12, 
            backgroundColor: t.success + '20', 
            borderWidth: 1, 
            borderColor: t.success, 
            borderRadius: 8, 
            padding: 12 
          }}>
            <Text style={{ color: t.success, fontSize: 12, fontWeight: '600' }}>
              🔒 Your app is protected with {biometricType}
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>
              You'll be asked to authenticate after 5 minutes of inactivity
            </Text>
          </View>
        )}
      </View>

      {/* Privacy & Data */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
          PRIVACY & DATA
        </Text>
        
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
          <TouchableOpacity 
            onPress={handleClearAllData}
            style={{ padding: 16 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: t.danger, fontSize: 16, fontWeight: '600' }}>
                  Clear All Data
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Delete all wallets, transactions, and settings
                </Text>
              </View>
              <Text style={{ fontSize: 20 }}>🗑️</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ 
          marginTop: 12, 
          backgroundColor: t.danger + '20', 
          borderWidth: 1, 
          borderColor: t.danger, 
          borderRadius: 8, 
          padding: 12 
        }}>
          <Text style={{ color: t.danger, fontSize: 12, fontWeight: '600' }}>
            ⚠️ Warning
          </Text>
          <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>
            Clearing data is permanent and cannot be undone. Make sure to backup your data first.
          </Text>
        </View>
      </View>

      {/* Security Tips */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
          SECURITY TIPS
        </Text>
        
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, marginBottom: 8 }}>
            💡 Keep your data safe:
          </Text>
          <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 18 }}>
            • Enable biometric lock for added security{'\n'}
            • Regularly backup your data{'\n'}
            • Never share your device PIN or biometrics{'\n'}
            • Keep your device OS updated
          </Text>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
