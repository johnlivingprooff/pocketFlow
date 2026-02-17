import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, useColorScheme, Modal, FlatList, Switch, Image, StyleSheet } from 'react-native';
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
import { ChartIcon, SettingsIcon as CategorySettingsIcon, TransferIcon, WatchIcon, MoneyIcon } from '../../src/assets/icons/CategoryIcons';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { ThemePreview } from '../../src/components/ThemePreview';

const APP_VERSION = "2.0.1"; // Manually overridden for v2.0.1 release
const TAP_OPACITY = 0.85;

export default function SettingsScreen() {
  const {
    themeMode,
    setThemeMode,
    biometricEnabled,
    setBiometricEnabled,
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: t.textSecondary }]}>Make pocketFlow feel personal, secure, and easy to maintain.</Text>
        </View>

        <View style={[styles.heroCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={[styles.heroAccent, { backgroundColor: t.primary }]} />
          <Link href="/profile" asChild>
            <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.heroProfileRow, { borderBottomColor: t.border }]}> 
              <View style={styles.profileRowLeft}>
                <View style={[styles.avatar, { backgroundColor: t.primary }]}> 
                  {userInfo?.profileImage ? (
                    <Image source={{ uri: userInfo.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitial}>{(userInfo?.name || 'U').charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: t.textPrimary }]}>{userInfo?.name || 'Your Profile'}</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textSecondary }]} numberOfLines={1}>
                    {userInfo?.email || 'Add your details for a personalized dashboard'}
                  </Text>
                </View>
              </View>
              <View style={[styles.inlinePill, { backgroundColor: `${t.primary}18`, borderColor: `${t.primary}40` }]}>
                <Text style={[styles.inlinePillText, { color: t.primary }]}>Edit</Text>
              </View>
            </TouchableOpacity>
          </Link>

          <View style={styles.heroQuickPrefsRow}>
            <TouchableOpacity
              activeOpacity={TAP_OPACITY}
              onPress={() => setShowThemePicker(true)}
              style={[styles.quickPrefCard, { backgroundColor: t.background, borderColor: t.border }]}
            >
              <View style={styles.quickPrefHeader}>
                <Text style={[styles.quickPrefLabel, { color: t.textSecondary }]}>Theme</Text>
                <View style={[styles.quickPrefIconBadge, { backgroundColor: `${t.primary}18`, borderColor: `${t.primary}40` }]}>
                  <CategorySettingsIcon size={12} color={t.primary} />
                </View>
              </View>
              <Text style={[styles.quickPrefValue, { color: t.textPrimary }]} numberOfLines={1}>{getThemeLabel()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={TAP_OPACITY}
              onPress={() => setShowCurrencyPicker(true)}
              style={[styles.quickPrefCard, { backgroundColor: t.background, borderColor: t.border }]}
            >
              <View style={styles.quickPrefHeader}>
                <Text style={[styles.quickPrefLabel, { color: t.textSecondary }]}>Currency</Text>
                <View style={[styles.quickPrefIconBadge, { backgroundColor: `${t.primary}18`, borderColor: `${t.primary}40` }]}>
                  <MoneyIcon size={12} color={t.primary} />
                </View>
              </View>
              <Text style={[styles.quickPrefValue, { color: t.textPrimary }]}>{defaultCurrency}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={TAP_OPACITY}
            onPress={() => setShowBackupModal(true)}
            style={[styles.quickInfoStrip, { backgroundColor: t.background, borderColor: t.border }]}
          >
            <Text style={[styles.quickInfoLabel, { color: t.textSecondary }]}>Backups</Text>
            <Text style={[styles.quickInfoValue, { color: t.textPrimary }]}>
              {backups.length > 0 ? `${backups.length} available` : 'No backups yet'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>QUICK ACCESS</Text>
          <View style={styles.actionGrid}>
            <Link href="/budget" asChild>
              <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.actionTile, { backgroundColor: t.card, borderColor: t.border }]}> 
                <View style={[styles.tileIconWrap, { backgroundColor: `${t.primary}14`, borderColor: `${t.primary}30` }]}>
                  <ChartIcon size={14} color={t.primary} />
                </View>
                <Text style={[styles.actionTileTitle, { color: t.textPrimary }]}>Budget & Goals</Text>
                <Text style={[styles.actionTileSubtitle, { color: t.textSecondary }]}>Track your plan</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/categories" asChild>
              <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.actionTile, { backgroundColor: t.card, borderColor: t.border }]}> 
                <View style={[styles.tileIconWrap, { backgroundColor: `${t.primary}14`, borderColor: `${t.primary}30` }]}>
                  <CategorySettingsIcon size={14} color={t.primary} />
                </View>
                <Text style={[styles.actionTileTitle, { color: t.textPrimary }]}>Categories</Text>
                <Text style={[styles.actionTileSubtitle, { color: t.textSecondary }]}>Organize spending</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/settings/recurring" asChild>
              <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.actionTile, { backgroundColor: t.card, borderColor: t.border }]}> 
                <View style={[styles.tileIconWrap, { backgroundColor: `${t.primary}14`, borderColor: `${t.primary}30` }]}>
                  <TransferIcon size={14} color={t.primary} />
                </View>
                <Text style={[styles.actionTileTitle, { color: t.textPrimary }]}>Recurring</Text>
                <Text style={[styles.actionTileSubtitle, { color: t.textSecondary }]}>Automated entries</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/settings/reminders" asChild>
              <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.actionTile, { backgroundColor: t.card, borderColor: t.border }]}> 
                <View style={[styles.tileIconWrap, { backgroundColor: `${t.primary}14`, borderColor: `${t.primary}30` }]}>
                  <WatchIcon size={14} color={t.primary} />
                </View>
                <Text style={[styles.actionTileTitle, { color: t.textPrimary }]}>Reminders</Text>
                <Text style={[styles.actionTileSubtitle, { color: t.textSecondary }]}>Daily nudges</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>SECURITY</Text>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}> 
            <Link href="/settings/security" asChild>
              <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.row, styles.rowDivider, { borderBottomColor: t.border }]}> 
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Security Settings</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>PIN, privacy, and app protection options</Text>
                </View>
                <View style={styles.rightMetaWrap}>
                  <View style={[styles.inlinePill, { backgroundColor: biometricEnabled ? `${t.primary}20` : `${t.border}`, borderColor: biometricEnabled ? `${t.primary}40` : t.border }]}>
                    <Text style={[styles.inlinePillText, { color: biometricEnabled ? t.primary : t.textSecondary }]}>
                      {biometricEnabled ? 'Protected' : 'Basic'}
                    </Text>
                  </View>
                  <Text style={[styles.chevron, { color: t.textSecondary }]}>›</Text>
                </View>
              </TouchableOpacity>
            </Link>

            <View style={styles.row}>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Use {biometricType}</Text>
                <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>
                  {biometricAvailable ? 'Secure app access with biometrics' : 'Not available on this device'}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{ false: t.border, true: `${t.primary}88` }}
                thumbColor={biometricEnabled ? t.primary : t.textSecondary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>DATA TOOLS</Text>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}> 
            <Link href="/settings/receipts" asChild>
              <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.row, styles.rowDivider, { borderBottomColor: t.border }]}> 
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Receipts Gallery</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>Browse all saved receipts</Text>
                </View>
                <ReceiptIcon size={24} color={t.textPrimary} />
              </TouchableOpacity>
            </Link>

            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleExportCSV} style={[styles.row, styles.rowDivider, { borderBottomColor: t.border }]}>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Export to CSV</Text>
                <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>Download all transactions</Text>
              </View>
              <ExportIcon size={24} color={t.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={TAP_OPACITY}
              onPress={handleCreateBackup}
              disabled={isLoadingBackup}
              style={[styles.row, styles.rowDivider, { borderBottomColor: t.border, opacity: isLoadingBackup ? 0.6 : 1 }]}
            >
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Create Backup</Text>
                <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>Save all app data locally</Text>
              </View>
              <BackupIcon size={24} color={t.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowBackupModal(true)} style={styles.row}>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Restore Backup</Text>
                <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}> 
                  {backups.length > 0 ? `${backups.length} backup(s) available` : 'No backups found'}
                </Text>
              </View>
              <Text style={[styles.actionIcon, { color: t.textPrimary }]}>↻</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.noteCard, { backgroundColor: `${t.warning}10`, borderColor: `${t.warning}35` }]}>
            <Text style={[styles.noteTitle, { color: t.warning }]}>Before you restore</Text>
            <Text style={[styles.noteText, { color: t.textSecondary }]}>Restoring a backup replaces current app data. Create a fresh backup first if you need a rollback point.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>SUPPORT & ABOUT</Text>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}> 
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleFeedback} style={[styles.row, styles.rowDivider, { borderBottomColor: t.border }]}> 
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Send Feedback</Text>
                <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>Help us improve pocketFlow</Text>
              </View>
              <Text style={[styles.chevron, { color: t.textSecondary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleVersionTap} style={styles.row}>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: t.textPrimary }]}>App Version</Text>
                <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>{APP_VERSION}</Text>
              </View>
              <View style={[styles.inlinePill, { backgroundColor: `${t.success}14`, borderColor: `${t.success}38` }]}>
                <Text style={[styles.inlinePillText, { color: t.success }]}>Stable</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {showDevOptions && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>DEVELOPER OPTIONS</Text>
            <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}> 
              <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleRestartOnboarding} style={styles.row}>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: colors.negativeRed }]}>Restart Onboarding</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textSecondary }]}>Restart the setup flow</Text>
                </View>
                <Text style={[styles.actionIcon, { color: colors.negativeRed }]}>⟲</Text>
              </TouchableOpacity>
            </View>
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
                  activeOpacity={TAP_OPACITY}
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
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowThemePicker(false)} style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: t.border }}>
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
                <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => { useSettings.getState().setDefaultCurrency(item); setShowCurrencyPicker(false); }} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
                  <Text style={{ color: defaultCurrency === item ? t.primary : t.textPrimary, fontSize: 16, fontWeight: defaultCurrency === item ? '800' : '600' }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowCurrencyPicker(false)} style={{ padding: 16, alignItems: 'center' }}>
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
              <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowBackupModal(false)}>
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
                  <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => handleRestoreBackup(item.uri)} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
                    <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>
                      {item.date.toLocaleDateString()} at {item.date.toLocaleTimeString()}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>{item.filename}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowBackupModal(false)} style={{ padding: 16, alignItems: 'center' }}>
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

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 14,
    marginBottom: 22,
  },
  heroAccent: {
    width: 44,
    height: 4,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 10,
  },
  heroProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  heroQuickPrefsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickPrefCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  quickPrefLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickPrefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  quickPrefIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPrefValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickInfoStrip: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickInfoValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionTile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tileIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTileTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionTileSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  rowTextWrap: {
    flex: 1,
  },
  rightMetaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlinePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inlinePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
  },
  profileRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  actionIcon: {
    fontSize: 20,
  },
  noteCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
