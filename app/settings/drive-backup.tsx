import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
  useColorScheme,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { ThemedAlert } from '@/components/ThemedAlert';
import { useAlert } from '@/lib/hooks/useAlert';
import { DriveIcon } from '@/assets/icons/DriveIcon';
import { BackupIcon } from '@/assets/icons/BackupIcon';
import {
  signInToDrive,
  signOutFromDrive,
  getLinkedDriveAccount,
  isDriveCancelledError,
  isDriveSessionExpiredError,
} from '@/lib/services/drive/driveAuth';
import {
  listDriveBackups,
  createAndUploadDriveBackup,
  restoreFromDriveBackup,
  deleteDriveBackup,
  saveDrivePassphrase,
  hasDrivePassphrase,
  removeDrivePassphrase,
  describeDriveError,
  MAX_REMOTE_BACKUPS,
  DriveRemoteFile,
  DriveBackupProgressStage,
} from '@/lib/services/drive/driveBackupService';
import { isDriveConfigured, driveSetupHint } from '@/lib/services/drive/driveConfig';
import { HelpLink } from '@/components/HelpLink';
import { log } from '@/utils/logger';

const TAP_OPACITY = 0.7;

function formatBytes(size: number | null): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function DriveBackupScreen() {
  const systemColorScheme = useColorScheme();
  const {
    themeMode,
    driveAccount,
    driveAutoBackupEnabled,
    driveLastSyncAt,
    setDriveAccount,
    setDriveAutoBackupEnabled,
    setDriveLastSyncAt,
  } = useSettings();
  const mode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(mode);

  const { alertConfig, showErrorAlert, showConfirmAlert, showSuccessAlert, dismissAlert } = useAlert();

  const [linking, setLinking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<DriveBackupProgressStage | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadBtnWidth, setUploadBtnWidth] = useState(0);
  const uploadTargetRef = useRef(0);
  const uploadProgressRef = useRef(0);
  const [restoringFile, setRestoringFile] = useState<DriveRemoteFile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [backups, setBackups] = useState<DriveRemoteFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [passphraseSet, setPassphraseSet] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [restorePassphraseInput, setRestorePassphraseInput] = useState('');

  const loadEverything = useCallback(async () => {
    const [profile, passphraseExists] = await Promise.all([getLinkedDriveAccount(), hasDrivePassphrase()]);
    if (profile) setDriveAccount({ email: profile.email, name: profile.name });
    setPassphraseSet(passphraseExists);
  }, [setDriveAccount]);

  useFocusEffect(
    useCallback(() => {
      void loadEverything();
    }, [loadEverything])
  );

  useEffect(() => {
    if (isDriveConfigured()) {
      refreshBackupList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBackupList = useCallback(async () => {
    setLoadingList(true);
    try {
      setBackups(await listDriveBackups());
    } catch (e) {
      if (isDriveSessionExpiredError(e)) {
        setDriveAccount(null);
        showErrorAlert('Session expired', 'Your Google session expired. Please link your account again.');
      } else {
        log('[Drive] List failed', { message: describeDriveError(e) });
        showErrorAlert('Drive sync failed', describeDriveError(e));
      }
    } finally {
      setLoadingList(false);
    }
  }, [setDriveAccount, showErrorAlert]);

  const handleLink = async () => {
    setLinking(true);
    try {
      const profile = await signInToDrive();
      setDriveAccount({ email: profile.email, name: profile.name });
      setDriveLastSyncAt(null);
      refreshBackupList();
      showSuccessAlert(
        'Google Account Linked',
        `Drive backups will be stored in a private "${'pocketFlowBackups'}" folder in ${profile.email}'s Google Drive.`
      );
    } catch (e) {
      if (isDriveCancelledError(e)) return;
      if (!isDriveConfigured()) {
        showErrorAlert('Not configured', driveSetupHint());
        return;
      }
      showErrorAlert('Link failed', describeDriveError(e));
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = () => {
    showConfirmAlert(
      'Unlink Google Drive',
      'Remote backups stay in your Drive, but this app will no longer upload or restore them. Continue?',
      async () => {
        try {
          await signOutFromDrive();
        } catch (e) {
          log('[Drive] Sign out cleanup issue', { message: describeDriveError(e) });
        }
        setDriveAccount(null);
        setDriveAutoBackupEnabled(false);
        setDriveLastSyncAt(null);
        setBackups([]);
        showSuccessAlert('Unlinked', 'Google Drive is no longer linked to pocketFlow.');
      }
    );
  };

  const handleToggleAutoUpload = (value: boolean) => {
    if (value && !passphraseSet) {
      showErrorAlert(
        'Passphrase required',
        'Set a backup passphrase first so automatic backups can be encrypted before upload.'
      );
      return;
    }
    setDriveAutoBackupEnabled(value);
  };

  useEffect(() => {
    if (uploadStage !== 'creating') return;
    const id = setInterval(() => {
      const current = uploadProgressRef.current;
      const target = uploadTargetRef.current;
      if (current >= target) return;
      const next = Math.min(target, current + Math.max(2, Math.ceil((target - current) * 0.2)));
      uploadProgressRef.current = next;
      setUploadPercent(next);
    }, 100);
    return () => clearInterval(id);
  }, [uploadStage]);

  const handleUploadProgress = useCallback((stage: DriveBackupProgressStage, percent: number) => {
    setUploadStage(stage);
    if (stage === 'uploading') {
      uploadProgressRef.current = percent;
      setUploadPercent(percent);
    } else {
      uploadTargetRef.current = percent;
    }
  }, []);

  const handleUploadNow = async () => {
    if (!driveAccount) {
      showErrorAlert('Not linked', 'Link your Google account first.');
      return;
    }
    setUploading(true);
    setUploadStage('creating');
    setUploadPercent(0);
    uploadTargetRef.current = 0;
    uploadProgressRef.current = 0;
    try {
      await createAndUploadDriveBackup(handleUploadProgress);
      setDriveLastSyncAt(Date.now());
      await refreshBackupList();
      showSuccessAlert('Backup uploaded', 'Your encrypted backup was uploaded to Google Drive.');
    } catch (e) {
      log('[Drive] Upload failed', { message: describeDriveError(e) });
      if (isDriveSessionExpiredError(e)) {
        setDriveAccount(null);
        showErrorAlert('Session expired', 'Your Google session expired. Please link your account again.');
      } else if (isDriveCancelledError(e)) {
        showErrorAlert('Upload cancelled', 'The upload was cancelled. Please try again.');
      } else {
        showErrorAlert(
          'Upload failed',
          `Your backup could not be uploaded.\n\n${describeDriveError(e)}\n\nPlease check your connection and try again.`
        );
      }
    } finally {
      setUploading(false);
      setUploadStage(null);
      setUploadPercent(0);
      uploadTargetRef.current = 0;
      uploadProgressRef.current = 0;
    }
  };

  const handleSavePassphrase = async () => {
    if (passphraseInput.length < 8) {
      showErrorAlert('Weak passphrase', 'Use at least 8 characters.');
      return;
    }
    if (passphraseInput !== passphraseConfirm) {
      showErrorAlert('Passphrases do not match', 'Please enter the same passphrase twice.');
      return;
    }
    try {
      await saveDrivePassphrase(passphraseInput);
      setPassphraseSet(true);
      setShowPassphraseModal(false);
      setPassphraseInput('');
      setPassphraseConfirm('');
      showSuccessAlert(
        'Passphrase saved',
        'Backups are encrypted with this passphrase before leaving your device. Keep it safe — it is required to restore data on a new phone.'
      );
    } catch (e) {
      showErrorAlert('Error', describeDriveError(e));
    }
  };

  const handleRemovePassphrase = () => {
    showConfirmAlert(
      'Remove backup passphrase',
      'Future uploads will be blocked until you set a new passphrase. Existing remote backups cannot be decrypted without the old passphrase. Continue?',
      async () => {
        try {
          await removeDrivePassphrase();
          setPassphraseSet(false);
          setDriveAutoBackupEnabled(false);
          showSuccessAlert('Passphrase removed', 'Automatic drive uploads are now disabled.');
        } catch (e) {
          showErrorAlert('Error', describeDriveError(e));
        }
      }
    );
  };

  const handleRestore = (file: DriveRemoteFile) => {
    setRestoringFile(file);
    setRestorePassphraseInput('');
  };

  const confirmRestore = async () => {
    if (!restoringFile) return;
    if (restorePassphraseInput.length === 0) {
      showErrorAlert('Passphrase required', 'Enter the passphrase that protects this backup.');
      return;
    }
    const file = restoringFile;
    setRestoringFile(null);
    setRestorePassphraseInput('');
    showConfirmAlert(
      'Restore backup',
      'This will replace ALL current data on this device with the selected backup. Continue?',
      async () => {
        try {
          const result = await restoreFromDriveBackup(file.id, file.name, restorePassphraseInput);
          if (result.success) {
            showSuccessAlert('Restored', 'Data restored from Google Drive.');
          } else {
            showErrorAlert('Restore failed', result.error || 'Could not restore backup.');
          }
        } catch (e) {
          showErrorAlert('Restore failed', describeDriveError(e));
        }
      }
    );
  };

  const handleDelete = (file: DriveRemoteFile) => {
    showConfirmAlert(
      'Delete remote backup',
      `Delete "${file.name}" from Google Drive? This cannot be undone.`,
      async () => {
        setDeletingId(file.id);
        try {
          await deleteDriveBackup(file.id);
          await refreshBackupList();
          showSuccessAlert('Deleted', 'The remote backup was deleted.');
        } catch (e) {
          showErrorAlert('Delete failed', describeDriveError(e));
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const passphraseModalTitle = passphraseSet ? 'Change passphrase' : 'Set backup passphrase';
  const passphraseModalSubtitle = passphraseSet
    ? 'The new passphrase applies to future uploads only. Old backups keep their own passphrase.'
    : 'Protects every upload. You will need it to restore data on this or any new device.';

  const lastSyncLabel = driveLastSyncAt
    ? `Last upload ${new Date(driveLastSyncAt).toLocaleString()}`
    : 'No uploads yet';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      {Platform.OS === 'web' ? (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary }]}>Google Drive backup</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 8 }}>
              Drive backup is currently available on iOS and Android only.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Drive Backup</Text>
              <Text style={[styles.headerSubtitle, { color: t.textSecondary }]}>
                Encrypted secondary backups in your Google Drive
              </Text>
            </View>

            {/* Linked account card */}
            <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={styles.cardRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${t.primary}15` }]}>
                  <DriveIcon size={26} color={t.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary }]}>
                    {driveAccount ? driveAccount.name : 'Not linked'}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: t.textSecondary }]}>
                    {driveAccount ? driveAccount.email : 'Back up your data to your own Google Drive'}
                  </Text>
                </View>
              </View>

              {driveAccount ? (
                <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleUnlink} style={styles.secondaryButton}>
                  <Text style={{ color: t.danger, fontWeight: '700', fontSize: 14 }}>Unlink account</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={TAP_OPACITY}
                  onPress={handleLink}
                  disabled={linking}
                  style={[styles.primaryButton, { backgroundColor: t.primary }]}
                >
                  {linking ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: '#FFF' }]}>Link Google Account</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Passphrase card */}
            <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={styles.cardRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${t.primary}15` }]}>
                  <Text style={{ fontSize: 20, color: t.primary }}>🔒</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary }]}>Backup passphrase</Text>
                  <Text style={[styles.cardSubtitle, { color: t.textSecondary }]}>
                    {passphraseSet
                      ? 'Encryption active — backups are encrypted before upload'
                      : 'Required before the first upload'}
                  </Text>
                </View>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  activeOpacity={TAP_OPACITY}
                  onPress={() => {
                    setPassphraseInput('');
                    setPassphraseConfirm('');
                    setShowPassphraseModal(true);
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={{ color: t.primary, fontWeight: '700', fontSize: 14 }}>
                    {passphraseSet ? 'Change passphrase' : 'Set passphrase'}
                  </Text>
                </TouchableOpacity>
                {passphraseSet && (
                  <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleRemovePassphrase} style={styles.secondaryButton}>
                    <Text style={{ color: t.danger, fontWeight: '700', fontSize: 14 }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Sync controls */}
            <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary }]}>Automatic upload</Text>
                  <Text style={[styles.cardSubtitle, { color: t.textSecondary }]}>
                    Uploads new monthly auto-backups to Drive
                  </Text>
                </View>
                <Switch
                  value={driveAutoBackupEnabled}
                  onValueChange={handleToggleAutoUpload}
                  trackColor={{ true: t.primary, false: t.border }}
                  thumbColor="#FFF"
                  disabled={!driveAccount || !passphraseSet}
                />
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  activeOpacity={TAP_OPACITY}
                  onPress={handleUploadNow}
                  disabled={uploading || !driveAccount}
                  onLayout={(e) => setUploadBtnWidth(e.nativeEvent.layout.width)}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderColor: !driveAccount ? t.border : t.primary,
                      flex: 1,
                      overflow: 'hidden',
                      paddingVertical: uploading ? 0 : 13,
                    },
                  ]}
                >
                  {uploading ? (
                    <View style={styles.uploadProgressWrap}>
                      <View style={[styles.uploadProgressTrack, { backgroundColor: `${t.primary}26` }]} />
                      {uploadBtnWidth > 0 && (
                        <View
                          style={[
                            styles.uploadProgressClip,
                            { width: Math.round((uploadBtnWidth * Math.min(100, Math.max(0, uploadPercent))) / 100) },
                          ]}
                        >
                          <View style={[styles.uploadProgressSolid, { backgroundColor: t.primary, width: uploadBtnWidth }]} />
                          <Text style={[styles.uploadProgressLabel, { color: '#FFFFFF', width: uploadBtnWidth }]}>
                            {uploadStage === 'uploading'
                              ? `Uploading backup ${Math.round(uploadPercent)}%`
                              : `Creating backup ${Math.round(uploadPercent)}%`}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.uploadProgressLabel, { color: t.primary }]}>
                        {uploadStage === 'uploading'
                          ? `Uploading backup ${Math.round(uploadPercent)}%`
                          : `Creating backup ${Math.round(uploadPercent)}%`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: !driveAccount ? t.textTertiary : t.primary }]}>
                      Upload backup now
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {driveLastSyncAt !== null && (
                <Text style={[styles.cardSubtitle, { color: t.textSecondary, marginTop: 10 }]}>{lastSyncLabel}</Text>
              )}
            </View>

            {/* Remote backups */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>REMOTE BACKUPS</Text>
              <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={refreshBackupList} disabled={loadingList}>
                <Text style={{ color: t.primary, fontSize: 13, fontWeight: '700' }}>{loadingList ? 'Syncing…' : 'Refresh'}</Text>
              </TouchableOpacity>
            </View>

            {loadingList && backups.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <ActivityIndicator color={t.primary} />
              </View>
            ) : backups.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <BackupIcon size={28} color={t.textTertiary} />
                <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                  {driveAccount
                    ? 'No backups uploaded yet. Create one with "Upload backup now".'
                    : 'Link your Google account to see your remote backups.'}
                </Text>
              </View>
            ) : (
              backups.map((file) => (
                <View
                  key={file.id}
                  style={[styles.backupItem, { backgroundColor: t.card, borderColor: t.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.backupName, { color: t.textPrimary }]} numberOfLines={1}>
                      {formatDate(file.createdTime) || file.name}
                    </Text>
                    <Text style={[styles.backupMeta, { color: t.textSecondary }]}>
                      {file.name}
                      {formatBytes(file.size) ? ` · ${formatBytes(file.size)}` : ''}
                    </Text>
                  </View>
                  <View style={styles.backupActions}>
                    <TouchableOpacity
                      activeOpacity={TAP_OPACITY}
                      onPress={() => handleRestore(file)}
                      style={[styles.smallButton, { borderColor: t.primary }]}
                    >
                      <Text style={{ color: t.primary, fontSize: 13, fontWeight: '700' }}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={TAP_OPACITY}
                      onPress={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      style={[styles.smallButton, { borderColor: t.danger }]}
                    >
                      {deletingId === file.id ? (
                        <ActivityIndicator size="small" color={t.danger} />
                      ) : (
                        <Text style={{ color: t.danger, fontSize: 13, fontWeight: '700' }}>Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <HelpLink
              title="How it works"
              items={[
                'Backups are encrypted on this device (AES-256) before upload, so Google never sees your data.',
                'Keep your passphrase safe — without it, remote backups cannot be restored (especially on a new phone).',
                `The most recent ${MAX_REMOTE_BACKUPS} backups are kept automatically.`,
                'Restoring replaces all current data on this device.',
              ]}
            />
          </ScrollView>
        </>
      )}

      {/* Passphrase modal */}
      <Modal visible={showPassphraseModal} transparent animationType="fade" onRequestClose={() => setShowPassphraseModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>{passphraseModalTitle}</Text>
              <Text style={[styles.modalSubtitle, { color: t.textSecondary }]}>{passphraseModalSubtitle}</Text>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <TextInput
                value={passphraseInput}
                onChangeText={setPassphraseInput}
                placeholder="New passphrase (min 8 characters)"
                placeholderTextColor={t.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: t.background, borderColor: t.border, color: t.textPrimary }]}
              />
              <TextInput
                value={passphraseConfirm}
                onChangeText={setPassphraseConfirm}
                placeholder="Repeat passphrase"
                placeholderTextColor={t.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: t.background, borderColor: t.border, color: t.textPrimary }]}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                activeOpacity={TAP_OPACITY}
                onPress={() => setShowPassphraseModal(false)}
                style={[styles.modalButton, { borderColor: t.border }]}
              >
                <Text style={{ color: t.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={handleSavePassphrase} style={[styles.modalButton, { backgroundColor: t.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save passphrase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Restore passphrase modal */}
      <Modal visible={restoringFile !== null} transparent animationType="fade" onRequestClose={() => setRestoringFile(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Backup passphrase</Text>
              <Text style={[styles.modalSubtitle, { color: t.textSecondary }]}>
                Enter the passphrase that protects this backup to restore it.
              </Text>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <TextInput
                value={restorePassphraseInput}
                onChangeText={setRestorePassphraseInput}
                placeholder="Passphrase"
                placeholderTextColor={t.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: t.background, borderColor: t.border, color: t.textPrimary }]}
                onSubmitEditing={confirmRestore}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                activeOpacity={TAP_OPACITY}
                onPress={() => setRestoringFile(null)}
                style={[styles.modalButton, { borderColor: t.border }]}
              >
                <Text style={{ color: t.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={TAP_OPACITY} onPress={confirmRestore} style={[styles.modalButton, { backgroundColor: t.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={mode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    gap: 14,
  },
  header: {
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    fontWeight: '800',
    fontSize: 14,
  },
  uploadProgressWrap: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressTrack: {
    ...StyleSheet.absoluteFillObject,
  },
  uploadProgressClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  uploadProgressSolid: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  uploadProgressLabel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backupName: {
    fontSize: 14,
    fontWeight: '700',
  },
  backupMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    minHeight: 32,
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});