import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, useColorScheme, Modal, FlatList, Switch, Image, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { theme, ThemeMode, colors } from '../../src/theme/theme';
import { Link, useRouter } from 'expo-router';
import { CURRENCIES } from '../../src/constants/currencies';
import { checkBiometricAvailability, authenticateWithBiometrics } from '../../src/lib/services/biometricService';
import { createBackup, listBackups, restoreFromBackup } from '../../src/lib/export/backupRestore';
import { exportTransactionsToCSV } from '../../src/lib/export/csvExport';
import { BackupIcon } from '../../src/assets/icons/BackupIcon';
import { ExportIcon } from '../../src/assets/icons/ExportIcon';
import { ReceiptIcon } from '../../src/assets/icons/ReceiptIcon';
import { FingerprintIcon } from '../../src/assets/icons/FingerprintIcon';
import { SettingsIcon as CategorySettingsIcon, MoneyIcon } from '../../src/assets/icons/CategoryIcons';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { ThemePreview } from '../../src/components/ThemePreview';

const APP_VERSION = "2.0.1";
const TAP_OPACITY = 0.7;

// --- Custom Premium Icons for Settings Grid ---

const ThemePaletteIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M13.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.5" />
    <Path d="M9.07 15a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    <Path d="M16 8.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    <Path d="M16 13a3 3 0 0 0-3-3" />
  </Svg>
);

const CurrencyExchangeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="8" />
    <Path d="M12 16v-8" />
    <Path d="M9.5 10c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2" />
  </Svg>
);

const BudgetPieIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <Path d="M22 12A10 10 0 0 0 12 2v10z" />
  </Svg>
);

const LayersIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </Svg>
);

const CycleIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16" />
  </Svg>
);

const BellIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const SecurityShieldIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

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
  const router = useRouter();

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
      // We already checked availability on mount, no need to check again immediately
      // This prevents potential conflicts with the authentication prompt

      const auth = await authenticateWithBiometrics('Authenticate to enable biometric lock', {
        disableDeviceFallback: true, // Force biometric only to avoid fallback glitches
        cancelLabel: 'Cancel'
      });

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
      showConfirmAlert(
        'Disable Biometric Lock',
        'Are you sure you want to disable biometric authentication?',
        async () => {
          const auth = await authenticateWithBiometrics('Authenticate to disable biometric lock', {
            disableDeviceFallback: true,
            cancelLabel: 'Cancel'
          });
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

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={[styles.sectionHeaderTitle, { color: t.textSecondary }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Settings</Text>
        </View>

        {/* Profile Card */}
        <Link href="/profile" asChild>
          <TouchableOpacity activeOpacity={TAP_OPACITY} style={[styles.profileCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={styles.profileContent}>
              <View style={[styles.avatarContainer, { backgroundColor: t.primary }]}>
                {userInfo?.profileImage ? (
                  <Image source={{ uri: userInfo.profileImage }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{(userInfo?.name || 'U').charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: t.textPrimary }]}>{userInfo?.name || 'Your Profile'}</Text>
                <Text style={[styles.profileEmail, { color: t.textSecondary }]}>{userInfo?.email || 'Tap to sign in or edit details'}</Text>
              </View>
              <View style={[styles.editBadge, { backgroundColor: `${t.primary}15` }]}>
                <Text style={[styles.editBadgeText, { color: t.primary }]}>Edit</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Link>

        {/* Quick Preferences */}
        <View style={styles.prefsRow}>
          <TouchableOpacity
            style={[styles.prefItem, { backgroundColor: t.card, borderColor: t.border }]}
            onPress={() => setShowThemePicker(true)}
            activeOpacity={TAP_OPACITY}
          >
            <View style={[styles.prefIconCircle, { backgroundColor: `${t.primary}15` }]}>
              <ThemePaletteIcon size={22} color={t.primary} />
            </View>
            <View>
              <Text style={[styles.prefLabel, { color: t.textSecondary }]}>Theme</Text>
              <Text style={[styles.prefValue, { color: t.textPrimary }]} numberOfLines={1}>{getThemeLabel()}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.prefItem, { backgroundColor: t.card, borderColor: t.border }]}
            onPress={() => setShowCurrencyPicker(true)}
            activeOpacity={TAP_OPACITY}
          >
            <View style={[styles.prefIconCircle, { backgroundColor: `${t.primary}15` }]}>
              <CurrencyExchangeIcon size={22} color={t.primary} />
            </View>
            <View>
              <Text style={[styles.prefLabel, { color: t.textSecondary }]}>Currency</Text>
              <Text style={[styles.prefValue, { color: t.textPrimary }]} numberOfLines={1}>{defaultCurrency}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Management Grid */}
        <View style={styles.section}>
          {/* {renderSectionHeader('MANAGEMENT')} */}
          <View style={styles.gridContainer}>
            <Link href="/budget" asChild>
              <TouchableOpacity style={[styles.gridItem, { backgroundColor: t.card, borderColor: t.border }]} activeOpacity={TAP_OPACITY}>
                <View style={[styles.gridIcon, { backgroundColor: `${t.primary}15` }]}>
                  <BudgetPieIcon size={36} color={t.primary} />
                </View>
                <Text style={[styles.gridLabel, { color: t.textPrimary }]}>Budgets</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/categories" asChild>
              <TouchableOpacity style={[styles.gridItem, { backgroundColor: t.card, borderColor: t.border }]} activeOpacity={TAP_OPACITY}>
                <View style={[styles.gridIcon, { backgroundColor: `${t.primary}15` }]}>
                  <LayersIcon size={36} color={t.primary} />
                </View>
                <Text style={[styles.gridLabel, { color: t.textPrimary }]}>Categories</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/settings/recurring" asChild>
              <TouchableOpacity style={[styles.gridItem, { backgroundColor: t.card, borderColor: t.border }]} activeOpacity={TAP_OPACITY}>
                <View style={[styles.gridIcon, { backgroundColor: `${t.primary}15` }]}>
                  <CycleIcon size={36} color={t.primary} />
                </View>
                <Text style={[styles.gridLabel, { color: t.textPrimary }]}>Recurring</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/settings/reminders" asChild>
              <TouchableOpacity style={[styles.gridItem, { backgroundColor: t.card, borderColor: t.border }]} activeOpacity={TAP_OPACITY}>
                <View style={[styles.gridIcon, { backgroundColor: `${t.primary}15` }]}>
                  <BellIcon size={36} color={t.primary} />
                </View>
                <Text style={[styles.gridLabel, { color: t.textPrimary }]}>Reminders</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          {renderSectionHeader('SECURITY')}
          <View style={[styles.listContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <TouchableOpacity
              activeOpacity={TAP_OPACITY}
              onPress={() => router.push('/settings/security')}
              style={[styles.listItem, { borderBottomColor: t.border, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }]}
            >
              <View style={[styles.listIconLeft, { width: 32 }]}>
                <SecurityShieldIcon size={24} color={t.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Security Settings</Text>
                <Text style={[styles.listItemSubtitle, { color: t.textSecondary }]}>Passcode, Privacy, App Lock</Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={[styles.statusText, { color: biometricEnabled ? t.success : t.textSecondary }]}>
                  {biometricEnabled ? 'Active' : 'Setup'}
                </Text>
                <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.listItem}>
              <View style={[styles.listIconLeft, { width: 32 }]}>
                <FingerprintIcon size={24} color={t.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Biometric Unlock</Text>
                <Text style={[styles.listItemSubtitle, { color: t.textSecondary }]}>
                  {biometricAvailable ? `Use ${biometricType} to open app` : 'Not available'}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{ false: t.border, true: `${t.primary}80` }}
                thumbColor={biometricEnabled ? t.primary : t.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Data Tools */}
        <View style={styles.section}>
          {renderSectionHeader('DATA & STORAGE')}
          <View style={[styles.listContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <TouchableOpacity
              activeOpacity={TAP_OPACITY}
              onPress={() => router.push('/settings/receipts')}
              style={[styles.listItem, { borderBottomColor: t.border, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }]}
            >
              <View style={[styles.listIconLeft, { width: 32 }]}>
                <ReceiptIcon size={24} color={t.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Receipt Gallery</Text>
              </View>
              <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleExportCSV} style={[styles.listItem, { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
              <View style={[styles.listIconLeft, { width: 32 }]}>
                <ExportIcon size={24} color={t.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Export CSV</Text>
              </View>
              <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleCreateBackup} disabled={isLoadingBackup} style={[styles.listItem, { borderBottomColor: t.border, borderBottomWidth: 1, opacity: isLoadingBackup ? 0.6 : 1 }]}>
              <View style={[styles.listIconLeft, { width: 32 }]}>
                <BackupIcon size={24} color={t.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Create Backup</Text>
                <Text style={[styles.listItemSubtitle, { color: t.textSecondary }]}>{isLoadingBackup ? 'Processing...' : 'Save data locally'}</Text>
              </View>
              <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowBackupModal(true)} style={styles.listItem}>
              <View style={[styles.listIconLeft, { width: 32 }]}>
                <Text style={{ fontSize: 24, color: t.primary, lineHeight: 24 }}>↺</Text>
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Restore Backup</Text>
                <Text style={[styles.listItemSubtitle, { color: t.textSecondary }]}>{backups.length ? `${backups.length} available` : 'None found'}</Text>
              </View>
              <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & About */}
        <View style={styles.section}>
          {renderSectionHeader('ABOUT')}
          <View style={[styles.listContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleFeedback} style={[styles.listItem, { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Send Feedback</Text>
                <Text style={[styles.listItemSubtitle, { color: t.textSecondary }]}>Help us improve pocketFlow</Text>
              </View>
              <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleVersionTap} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: t.textPrimary }]}>Version</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: `${t.success}15` }}>
                  <Text style={{ color: t.success, fontSize: 10, fontWeight: '700' }}>v{APP_VERSION}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Options */}
        {showDevOptions && (
          <View style={styles.section}>
            {renderSectionHeader('DEVELOPER MODE')}
            <View style={[styles.listContainer, { backgroundColor: t.card, borderColor: colors.negativeRed }]}>
              <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleRestartOnboarding} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemTitle, { color: colors.negativeRed }]}>Restart Onboarding</Text>
                  <Text style={[styles.listItemSubtitle, { color: t.textSecondary }]}>Reset app state</Text>
                </View>
                <Text style={{ fontSize: 18, color: colors.negativeRed }}>⟲</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={showThemePicker} transparent animationType="fade" onRequestClose={() => setShowThemePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Select Theme</Text>
              <Text style={[styles.modalSubtitle, { color: t.textSecondary }]}>Choose your preferred look</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={TAP_OPACITY}
                  onPress={() => { setThemeMode(option.value); setShowThemePicker(false); }}
                  style={[styles.modalItem, { borderBottomColor: t.border }]}
                >
                  <ThemePreview themeMode={option.value} isSelected={themeMode === option.value} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemTitle, { color: themeMode === option.value ? t.primary : t.textPrimary }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.modalItemDesc, { color: t.textSecondary }]}>{option.description}</Text>
                  </View>
                  {themeMode === option.value && (
                    <Text style={{ color: t.primary, fontSize: 18, fontWeight: 'bold' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowThemePicker(false)} style={[styles.modalCloseButton, { borderTopColor: t.border }]}>
              <Text style={[styles.modalCloseText, { color: t.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Select Currency</Text>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => { useSettings.getState().setDefaultCurrency(item); setShowCurrencyPicker(false); }} style={[styles.modalItem, { borderBottomColor: t.border }]}>
                  <Text style={{ color: defaultCurrency === item ? t.primary : t.textPrimary, fontSize: 16, fontWeight: defaultCurrency === item ? '700' : '500' }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowCurrencyPicker(false)} style={[styles.modalCloseButton, { borderTopColor: t.border }]}>
              <Text style={[styles.modalCloseText, { color: t.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Backup Restore Modal */}
      <Modal visible={showBackupModal} transparent animationType="fade" onRequestClose={() => setShowBackupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Backups</Text>
              <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowBackupModal(false)}>
                <Text style={{ fontSize: 24, color: t.textSecondary }}>×</Text>
              </TouchableOpacity>
            </View>
            {backups.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: t.textSecondary, textAlign: 'center' }}>No backups found.</Text>
              </View>
            ) : (
              <FlatList
                data={backups}
                keyExtractor={(item) => item.uri}
                renderItem={({ item }) => (
                  <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => handleRestoreBackup(item.uri)} style={[styles.modalItem, { borderBottomColor: t.border }]}>
                    <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>
                      {item.date.toLocaleDateString()}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{item.filename}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <View style={{ padding: 16, backgroundColor: `${t.warning}10`, margin: 16, borderRadius: 8 }}>
              <Text style={{ color: t.warning, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Note</Text>
              <Text style={{ color: t.textSecondary, fontSize: 11 }}>Restoring will replace all current data.</Text>
            </View>
            <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={() => setShowBackupModal(false)} style={[styles.modalCloseButton, { borderTopColor: t.border }]}>
              <Text style={[styles.modalCloseText, { color: t.primary }]}>Close</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  header: {
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderContainer: {
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
  },
  editBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  prefsRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  prefItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  prefIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  prefValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center', // Center the section items
  },
  gridItem: {
    width: '45%',
    flexDirection: 'column', // Stack icon and text vertically
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 140,
  },
  gridIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center', // Center the text below the icon
  },
  listContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
    minHeight: 80,
  },
  listIconLeft: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  modalCloseText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
