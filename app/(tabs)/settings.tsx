import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, useColorScheme, Modal, FlatList, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { useSettings } from '../../src/store/useStore';
import { theme, ThemeMode } from '../../src/theme/theme';
import { Link } from 'expo-router';
import { CURRENCIES } from '../../src/constants/currencies';
import { checkBiometricAvailability, authenticateWithBiometrics } from '../../src/lib/services/biometricService';
import { createBackup, listBackups, restoreFromBackup } from '../../src/lib/export/backupRestore';
import { exportTransactionsToCSV } from '../../src/lib/export/csvExport';
import { BackupIcon } from '../../src/assets/icons/BackupIcon';
import { CsvIcon } from '../../src/assets/icons/CsvIcon';
import { ReceiptIcon } from '../../src/assets/icons/ReceiptIcon';
import appPackage from '../../package.json';

const APP_VERSION = appPackage.version;

export default function SettingsScreen() {
  const { 
    themeMode, 
    setThemeMode, 
    biometricEnabled, 
    setBiometricEnabled,
    biometricSetupComplete,
    setBiometricSetupComplete,
    defaultCurrency,
    userInfo,
  } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [backups, setBackups] = useState<Array<{ filename: string; uri: string; date: Date }>>([]);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isLoadingBackup, setIsLoadingBackup] = useState(false);

  useEffect(() => {
    checkBiometrics();
    loadBackups();
  }, []);

  const loadBackups = async () => {
    const backupList = await listBackups();
    setBackups(backupList);
  };

  const checkBiometrics = async () => {
    const result = await checkBiometricAvailability();
    setBiometricAvailable(result.isAvailable);
    if (result.isAvailable) {
      setBiometricType(result.biometricType);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Turning on - check availability first
      const availability = await checkBiometricAvailability();
      
      if (!availability.isAvailable) {
        Alert.alert(
          'Biometric Not Available',
          availability.error || 'Biometric authentication is not available on this device.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Authenticate to enable
      const auth = await authenticateWithBiometrics('Authenticate to enable biometric lock');
      
      if (auth.success) {
        setBiometricEnabled(true);
        setBiometricSetupComplete(true);
        Alert.alert(
          'Biometric Lock Enabled',
          `${biometricType} has been enabled. You'll be asked to authenticate when opening the app.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Authentication Failed',
          auth.error || 'Could not enable biometric lock.',
          [{ text: 'OK' }]
        );
      }
    } else {
      // Turning off - confirm with authentication
      Alert.alert(
        'Disable Biometric Lock',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              const auth = await authenticateWithBiometrics('Authenticate to disable biometric lock');
              if (auth.success) {
                setBiometricEnabled(false);
                Alert.alert('Biometric Lock Disabled', 'Biometric authentication has been disabled.');
              }
            },
          },
        ]
      );
    }
  };

  const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
    { value: 'light', label: 'Light', description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
    { value: 'system', label: 'System', description: 'Follow system preference' },
  ];

  const getThemeLabel = () => themeOptions.find(o => o.value === themeMode)?.label || 'System';
  
  const handleCreateBackup = async () => {
    setIsLoadingBackup(true);
    try {
      const result = await createBackup();
      if (result.success) {
        Alert.alert('Success', 'Backup created successfully', [
          {
            text: 'OK',
            onPress: () => {
              loadBackups();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create backup');
      }
    } finally {
      setIsLoadingBackup(false);
    }
  };

  const handleRestoreBackup = (uri: string) => {
    Alert.alert('Restore Backup', 'This will replace all current data. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          setIsLoadingBackup(true);
          try {
            const result = await restoreFromBackup(uri);
            if (result.success) {
              Alert.alert('Success', 'Data restored successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to restore backup');
            }
          } finally {
            setIsLoadingBackup(false);
          }
        },
      },
    ]);
  };

  const handleExportCSV = async () => {
    try {
      const result = await exportTransactionsToCSV();
      if (result.success && result.uri) {
        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Transactions',
          });
        } else {
          Alert.alert('Success', `CSV exported successfully to\n${result.uri}`);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to export CSV');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while exporting');
    }
  };

  const handleBackup = async () => Alert.alert('Backup', 'Backup feature will save your data');
  const handleExportCSVOld = async () => Alert.alert('Export CSV', 'CSV export feature coming soon');
  const handleFeedback = () => Linking.openURL('mailto:hello@eiteone.org?subject=Feedback');

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 0 }}>
        <View style={{ marginBottom: 24, paddingTop: 20 }}>
          {/* Header */}
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>Settings</Text>
        </View>

        {/* Profile */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>ACCOUNT</Text>
          <Link href="/profile" asChild>
            <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  {userInfo?.profileImage ? (
                    <Image source={{ uri: userInfo.profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
                      {(userInfo?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Profile</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12 }}>{userInfo.name}</Text>
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
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                  Use {biometricType}
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {biometricAvailable 
                    ? 'Secure app access with biometrics' 
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
        </View>

        {/* Transactions */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>TRANSACTIONS</Text>
          <Link href="/settings/recurring" asChild>
            <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Recurring Transactions</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Manage automated transactions</Text>
              </View>
              <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          </Link>
            <Link href="/budget" asChild>
              <TouchableOpacity style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Budget & Goals</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Set and manage category budgets</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Link>
        </View>

        {/* Data */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>DATA</Text>
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
            <Link href="/settings/receipts" asChild>
              <TouchableOpacity style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Receipts Gallery</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>View all receipts</Text>
                </View>
                <ReceiptIcon size={24} color={t.textPrimary} />
              </TouchableOpacity>
            </Link>
            <TouchableOpacity onPress={handleCreateBackup} disabled={isLoadingBackup} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Create Backup</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Save all data locally</Text>
              </View>
              <BackupIcon size={24} color={t.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBackupModal(true)} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Restore Backup</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {backups.length > 0 ? `${backups.length} backup(s) available` : 'No backups found'}
                </Text>
              </View>
              <Text style={{ fontSize: 20 }}>↻</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExportCSV} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Export to CSV</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Download all transactions</Text>
              </View>
              <CsvIcon size={24} color={t.textPrimary} />
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
      </ScrollView>

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

      {/* Backup Restore Modal */}
      <Modal visible={showBackupModal} transparent animationType="fade" onRequestClose={() => setShowBackupModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '80%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Available Backups</Text>
              <TouchableOpacity onPress={() => setShowBackupModal(false)}>
                <Text style={{ fontSize: 28, color: t.textSecondary, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>
            {backups.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>No backups found. Create one first!</Text>
              </View>
            ) : (
              <FlatList
                data={backups}
                keyExtractor={(item) => item.uri}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleRestoreBackup(item.uri)} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
                    <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>
                      {item.date.toLocaleDateString()} at {item.date.toLocaleTimeString()}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>{item.filename}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity onPress={() => setShowBackupModal(false)} style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: t.primary, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
