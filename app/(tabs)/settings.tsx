import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, useColorScheme, Modal, FlatList, Switch } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme, ThemeMode } from '../../src/theme/theme';
import { Link } from 'expo-router';
import { CURRENCIES } from '../../src/constants/currencies';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, biometricEnabled, setBiometricEnabled, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
    { value: 'light', label: 'Light', description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
    { value: 'system', label: 'System', description: 'Follow system preference' },
  ];

  const getThemeLabel = () => themeOptions.find(o => o.value === themeMode)?.label || 'System';
  const handleBackup = async () => Alert.alert('Backup', 'Backup feature will save your data');
  const handleExportCSV = async () => Alert.alert('Export CSV', 'CSV export feature coming soon');
  const handleFeedback = () => Linking.openURL('mailto:support@pocketflow.app?subject=Feedback');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>Settings</Text>

        {/* Profile */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>ACCOUNT</Text>
          <Link href="/profile" asChild>
            <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>U</Text>
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
          <TouchableOpacity onPress={() => setShowThemePicker(true)} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Theme</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{getThemeLabel()}</Text>
            </View>
            <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Regional */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>REGIONAL</Text>
          <TouchableOpacity onPress={() => setShowCurrencyPicker(true)} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Default Currency</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{defaultCurrency}</Text>
            </View>
            <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>SECURITY</Text>
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
            <Link href="/settings/security" asChild>
              <TouchableOpacity style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Security Settings</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Advanced options</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Link>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Use Biometrics</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Protect access to the app</Text>
              </View>
              <Switch value={biometricEnabled} onValueChange={setBiometricEnabled} />
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>DATA</Text>
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
            <TouchableOpacity onPress={handleBackup} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Backup & Restore</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Save your data</Text>
              </View>
              <Text style={{ fontSize: 20 }}>💾</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExportCSV} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
            <TouchableOpacity onPress={handleFeedback} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
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

      {/* Theme Picker Modal */}
      <Modal visible={showThemePicker} transparent animationType="fade" onRequestClose={() => setShowThemePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '80%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Select Theme</Text>
            </View>
            {themeOptions.map((option) => (
              <TouchableOpacity key={option.value} onPress={() => { setThemeMode(option.value); setShowThemePicker(false); }} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
                <Text style={{ color: themeMode === option.value ? t.primary : t.textPrimary, fontSize: 16, fontWeight: themeMode === option.value ? '800' : '600' }}>{option.label}</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>{option.description}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowThemePicker(false)} style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: t.primary, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '80%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Select Currency</Text>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { useSettings.getState().setDefaultCurrency(item); setShowCurrencyPicker(false); }} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
                  <Text style={{ color: defaultCurrency === item ? t.primary : t.textPrimary, fontSize: 16, fontWeight: defaultCurrency === item ? '800' : '600' }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)} style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: t.primary, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
