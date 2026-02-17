import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, useColorScheme, Modal, FlatList, Switch, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { theme, ThemeMode, colors } from '../../src/theme/theme';
import { Link } from 'expo-router';
import { CURRENCIES } from '../../src/constants/currencies';
import { checkBiometricAvailability, authenticateWithBiometrics } from '../../src/lib/services/biometricService';
import { createBackup, listBackups, restoreFromBackup } from '../../src/lib/export/backupRestore';
import { exportTransactionsToCSV } from '../../src/lib/export/csvExport';
import { BackupIcon } from '../../src/assets/icons/BackupIcon';
import { ExportIcon } from '../../src/assets/icons/ExportIcon';
import { ReceiptIcon } from '../../src/assets/icons/ReceiptIcon';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { ThemePreview } from '../../src/components/ThemePreview';
import appPackage from '../../package.json';

const APP_VERSION = "2.0.1"; // Manually overridden for v2.0.1 release

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
  const { resetOnboarding } = useOnboarding();
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
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showDevOptions, setShowDevOptions] = useState(false);

  const { alertConfig, showErrorAlert, showConfirmAlert, showSuccessAlert, dismissAlert } = useAlert();

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
        showErrorAlert(
          'Biometric Not Available',
          availability.error || 'Biometric authentication is not available on this device.'
        );
        return;
      }

      // Authenticate to enable
      const auth = await authenticateWithBiometrics('Authenticate to enable biometric lock');

      if (auth.success) {
        setBiometricEnabled(true);
        setBiometricSetupComplete(true);
        showSuccessAlert(
          'Biometric Lock Enabled',
          `${biometricType} has been enabled. You'll be asked to authenticate when opening the app.`
        );
      } else {
        showErrorAlert(
          'Authentication Failed',
          auth.error || 'Could not enable biometric lock.'
        );
      }
    } else {
      // Turning off - confirm with authentication
      showConfirmAlert(
        'Disable Biometric Lock',
        'Are you sure you want to disable biometric authentication?',
        async () => {
          const auth = await authenticateWithBiometrics('Authenticate to disable biometric lock');
          if (auth.success) {
            setBiometricEnabled(false);
            showSuccessAlert('Biometric Lock Disabled', 'Biometric authentication has been disabled.');
          }
        }
      );
    }
  };

  const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
    { value: 'light', label: 'Deep Teal (light)', description: 'Always use light theme' },
    { value: 'dark', label: 'Luxury Gold (dark)', description: 'Always use dark theme' },
    { value: 'dark-teal', label: 'Deep Teal (dark)', description: 'Dark theme with teal accents' },
    { value: 'system', label: 'System', description: 'Follow system preference' },
  ];

  const getThemeLabel = () => themeOptions.find(o => o.value === themeMode)?.label || 'System';

  const handleCreateBackup = async () => {
    setIsLoadingBackup(true);
    try {
      const result = await createBackup();
      if (result.success) {
        showSuccessAlert('Success', 'Backup created successfully', () => {
          loadBackups();
        });
      } else {
        showErrorAlert(
          'Error',
          (result.error || 'Failed to create backup') + '\n\nTry:\n• Check available storage space\n• Ensure stable internet connection\n• Retry after a few minutes'
        );
      }
    } finally {
      setIsLoadingBackup(false);
    }
  };

  const handleRestoreBackup = (uri: string) => {
    showConfirmAlert(
      'Restore Backup',
      'This will replace all current data. Are you sure?',
      async () => {
        setIsLoadingBackup(true);
        try {
          const result = await restoreFromBackup(uri);
          if (result.success) {
            showSuccessAlert('Success', 'Data restored successfully');
          } else {
            showErrorAlert(
              'Error',
              (result.error || 'Failed to restore backup') + '\n\nTry:\n• Verify the backup file is not corrupted\n• Check if the file format is correct\n• Create a new backup and try again'
            );
          }
        } finally {
          setIsLoadingBackup(false);
        }
      }
    );
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
          showSuccessAlert('Success', `CSV exported successfully to\n${result.uri}`);
        }
      } else {
        showErrorAlert('Error', result.error || 'Failed to export CSV');
      }
    } catch (error) {
      showErrorAlert('Error', 'An error occurred while exporting');
    }
  };

  const handleBackup = async () => showSuccessAlert('Backup', 'Backup feature will save your data');
  const handleExportCSVOld = async () => showSuccessAlert('Export CSV', 'CSV export feature coming soon');
  const handleFeedback = () => Linking.openURL('mailto:hello@eiteone.org?subject=Feedback');

  const handleVersionTap = () => {
    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);

    if (newCount === 6) {
      setShowDevOptions(true);
      showSuccessAlert(
        'Developer Options Unlocked',
        'Developer Options section is now visible in settings!'
      );
    }
  };

  const handleRestartOnboarding = () => {
    showConfirmAlert(
      'Restart Onboarding',
      'This will restart the onboarding flow. The app will begin setup as if it\'s a fresh install.',
      async () => {
        try {
          resetOnboarding();
          showSuccessAlert('Success', 'Onboarding has been restarted. Please restart the app.');
        } catch (error) {
          showErrorAlert('Error', 'Failed to restart onboarding');
        }
      }
    );
  };

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
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
            <Link href="/settings/reminders" asChild>
              <TouchableOpacity style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Reminder Settings</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Daily expense logging reminder</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/categories" asChild>
              <TouchableOpacity style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Categories</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Manage income & expense categories</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/settings/recurring" asChild>
              <TouchableOpacity style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Recurring Transactions</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Manage automated transactions</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/budget" asChild>
              <TouchableOpacity style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Budget & Goals</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Set and manage category budgets</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
              <ExportIcon size={24} color={t.textPrimary} />
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
            <TouchableOpacity onPress={handleVersionTap} style={{ padding: 16 }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>App Version</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{APP_VERSION}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Options - Conditionally Visible */}
        {showDevOptions && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>DEVELOPER OPTIONS</Text>
            <TouchableOpacity onPress={handleRestartOnboarding} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.negativeRed, fontSize: 16, fontWeight: '600' }}>Restart Onboarding</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Restart the setup flow</Text>
              </View>
              <Text style={{ fontSize: 20 }}>⟲</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={showThemePicker} transparent animationType="fade" onRequestClose={() => setShowThemePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '90%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Select Theme</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Preview how each theme looks</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {themeOptions.map((option) => (
                <TouchableOpacity 
                  key={option.value} 
                  onPress={() => { setThemeMode(option.value); setShowThemePicker(false); }} 
                  style={{ 
                    padding: 16, 
                    borderBottomWidth: 1, 
                    borderBottomColor: t.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <ThemePreview themeMode={option.value} isSelected={themeMode === option.value} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      color: themeMode === option.value ? t.primary : t.textPrimary, 
                      fontSize: 16, 
                      fontWeight: themeMode === option.value ? '800' : '600' 
                    }}>
                      {option.label}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>{option.description}</Text>
                  </View>
                  {themeMode === option.value && (
                    <Text style={{ color: t.primary, fontSize: 20, fontWeight: '800' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowThemePicker(false)} style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: t.border }}>
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
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={effectiveMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}
