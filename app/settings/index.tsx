import React from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, Linking } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { Link } from 'expo-router';
import { exportData } from '../../src/lib/services/fileService';
import * as FileSystem from 'expo-file-system';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, biometricEnabled, setBiometricEnabled, defaultCurrency } = useSettings();
  const t = theme(themeMode);

  const handleBackup = async () => {
    try {
      Alert.alert('Backup', 'Backup feature will save your data');
    } catch (error) {
      Alert.alert('Error', 'Failed to create backup');
    }
  };

  const handleExportCSV = async () => {
    Alert.alert('Export CSV', 'CSV export feature coming soon');
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:support@pocketflow.app?subject=Feedback');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>Settings</Text>

        {/* Profile Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>ACCOUNT</Text>
          <Link href="/profile" asChild>
            <TouchableOpacity style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: t.accent,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: t.background, fontSize: 20, fontWeight: '700' }}>U</Text>
                </View>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Profile</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12 }}>Manage your account</Text>
                </View>
              </View>
              <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Appearance */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>APPEARANCE</Text>
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Dark Mode</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Use dark theme</Text>
              </View>
              <Switch 
                value={themeMode === 'dark'} 
                onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')}
                trackColor={{ false: t.border, true: t.accent }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Currency */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>REGIONAL</Text>
          <Link href="/settings/currency" asChild>
            <TouchableOpacity style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Currency</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{defaultCurrency}</Text>
              </View>
              <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Security */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>SECURITY</Text>
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Biometric Lock</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Use fingerprint/face ID</Text>
                </View>
                <Switch 
                  value={biometricEnabled} 
                  onValueChange={(v) => setBiometricEnabled(v)}
                  trackColor={{ false: t.border, true: t.accent }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
            <Link href="/settings/security" asChild>
              <TouchableOpacity style={{
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Security Settings</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Advanced options</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Data Management */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>DATA</Text>
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            <TouchableOpacity
              onPress={handleBackup}
              style={{
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: t.border
              }}
            >
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Backup & Restore</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Save your data</Text>
              </View>
              <Text style={{ fontSize: 20 }}>💾</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportCSV}
              style={{
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Export to CSV</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Download spreadsheet</Text>
              </View>
              <Text style={{ fontSize: 20 }}>📊</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>ABOUT</Text>
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            <TouchableOpacity
              onPress={handleFeedback}
              style={{
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: t.border
              }}
            >
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Send Feedback</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Help us improve</Text>
              </View>
              <Text style={{ fontSize: 20 }}>💬</Text>
            </TouchableOpacity>

            <View style={{ padding: 16 }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>App Version</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{APP_VERSION}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
