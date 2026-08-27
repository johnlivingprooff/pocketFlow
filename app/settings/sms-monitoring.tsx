import React, { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { useAlert } from '@/lib/hooks/useAlert';
import { ThemedAlert } from '@/components/ThemedAlert';
import { HelpLink } from '@/components/HelpLink';
import { countPendingSms } from '@/lib/db/pendingTransactions';
import {
  getSmsPermissionStatus,
  requestSmsPermission,
  runSmsRuntimeGateCheck,
  setSmsScanningEnabled,
} from '@/lib/services/smsTransactionService';
import { log, error as logError } from '@/utils/logger';

export default function SmsMonitoringSettingsScreen() {
  const {
    themeMode,
    smsScanningEnabled,
    smsPermissionStatus,
    setSmsPermissionStatus,
  } = useSettings();
  const systemColorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const t = useMemo(
    () => theme(themeMode, systemColorScheme || 'light'),
    [themeMode, systemColorScheme]
  );
  const compact = width <= 360;
  const router = useRouter();
  const { alertConfig, showAlert, showErrorAlert, showSuccessAlert, dismissAlert } = useAlert();

  const [enabled, setEnabled] = useState(smsScanningEnabled);
  const [permissionStatus, setPermissionStatus] = useState(smsPermissionStatus);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingSettingsReturn, setAwaitingSettingsReturn] = useState(false);

  const isAndroid = Platform.OS === 'android';

  const refreshPermission = async () => {
    const status = await getSmsPermissionStatus();
    const next = status.readSms && status.receiveSms ? 'granted' : 'denied';
    setSmsPermissionStatus(next);
    setPermissionStatus(next);
    return next;
  };

  const refreshPendingCount = async () => {
    try {
      setPendingCount(await countPendingSms());
    } catch (err: unknown) {
      logError('[SmsSettings] Failed to load pending count', { error: err });
    }
  };

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      const next = await refreshPermission();
      if (mounted && awaitingSettingsReturn && next === 'granted') {
        showSuccessAlert(
          'SMS Access Enabled',
          'pocketFlow can now read transaction SMS. New messages will appear as pending entries.'
        );
        setAwaitingSettingsReturn(false);
      }
    };

    void sync();
    void refreshPendingCount();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void sync();
        void refreshPendingCount();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingSettingsReturn]);

  const openSystemSettings = async () => {
    setAwaitingSettingsReturn(true);
    try {
      await Linking.openSettings();
    } catch {
      setAwaitingSettingsReturn(false);
      showErrorAlert(
        'Open Settings Failed',
        'Could not open system settings. Please open your device settings and enable SMS access for pocketFlow.'
      );
    }
  };

  const handleToggle = async (nextEnabled: boolean) => {
    if (!isAndroid) return;
    setBusy(true);
    try {
      const active = await setSmsScanningEnabled(nextEnabled);
      setEnabled(active);
      if (active) {
        await refreshPendingCount();
      } else {
        setPendingCount(null);
        await handleRequestPermission();
      }
    } catch (err: unknown) {
      logError('[SmsSettings] Toggle failed', { error: err });
      showErrorAlert(
        'SMS Scanning Error',
        'Could not update SMS scanning. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRequestPermission = async () => {
    if (!isAndroid) return;
    setBusy(true);
    try {
      const result = await requestSmsPermission();
      if (result.granted) {
        setSmsPermissionStatus('granted');
        setPermissionStatus('granted');
        setEnabled(true);
        await refreshPendingCount();
        showSuccessAlert(
          'SMS Access Granted',
          'New transaction SMS will appear as pending entries to confirm.'
        );
        return;
      }
      if (result.blocked) {
        // Xiaomi/MIUI and some OEMs auto-deny SMS prompts: manual grant only.
        setAwaitingSettingsReturn(true);
        showAlert(
          'SMS Access Blocked by System',
          'This device (e.g. Xiaomi/MIUI) does not allow SMS permission to be granted in-app.\n\n' +
            'Open the pocketFlow app settings and turn on "SMS" manually (or "Receive SMS" where listed), then tap Refresh Permission.\n\n' +
            'Developer option: adb shell pm grant com.eiteone.pocketflow android.permission.READ_SMS',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open App Settings', style: 'success', onPress: () => void openSystemSettings() },
          ]
        );
        return;
      }
      showErrorAlert(
        'Permission Required',
        'SMS access was denied. Please allow it when prompted, or open app settings to enable SMS access for pocketFlow.'
      );
    } catch (err: unknown) {
      logError('[SmsSettings] Permission request failed', { error: err });
      showErrorAlert('Permission Error', 'Could not request SMS access. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    const next = await refreshPermission();
    await runSmsRuntimeGateCheck();
    if (next !== 'granted' && enabled) {
      showErrorAlert(
        'Permission Missing',
        'SMS access is no longer granted, so automatic entries are paused. Enable SMS access in system settings.'
      );
    } else {
      showSuccessAlert('Permission Status', next === 'granted' ? 'SMS access granted.' : 'SMS access not granted.');
    }
  };

  const status =
    !isAndroid
      ? 'unsupported'
      : enabled
        ? permissionStatus === 'granted'
          ? 'active'
          : 'needs_permission'
        : 'off';

  const statusLabel =
    status === 'active'
      ? 'Active'
      : status === 'needs_permission'
        ? 'Action Needed'
        : status === 'unsupported'
          ? 'Unavailable'
          : 'Off';

  const statusMessage =
    status === 'active'
      ? 'New Airtel Money, TNM Mpamba and bank SMS will appear as pending entries to confirm.'
      : status === 'needs_permission'
        ? 'Scanning is on, but SMS access is needed before messages can be read.'
        : status === 'unsupported'
          ? 'SMS monitoring is only available on Android.'
          : 'SMS monitoring is turned off.';

  const statusColor =
    status === 'active'
      ? t.success
      : status === 'needs_permission'
        ? t.warning
        : t.textSecondary;

  const statusBg =
    status === 'active'
      ? `${t.success}14`
      : status === 'needs_permission'
        ? `${t.warning}14`
        : `${t.border}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View
            style={[
              styles.statusHero,
              {
                backgroundColor: statusBg,
                borderColor: `${statusColor}44`,
              },
            ]}
          >
            <View style={styles.statusHeroRow}>
              <Text style={[styles.statusHeroTitle, { color: t.textPrimary }]}>SMS Monitoring Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={[styles.statusHeroMessage, { color: t.textSecondary }]}>{statusMessage}</Text>
          </View>

          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: t.textPrimary }]}>Auto-log from SMS</Text>
              <Text style={[styles.subLabel, { color: t.textSecondary }]}>
                Read transaction messages from Airtel Money, TNM Mpamba and banks.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={!isAndroid || busy}
            />
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: t.textSecondary }]}>SMS permission</Text>
            <Text
              style={[
                styles.metaValue,
                {
                  color:
                    permissionStatus === 'granted'
                      ? t.success
                      : permissionStatus === 'undetermined'
                        ? t.warning
                        : t.danger,
                },
              ]}
            >
              {permissionStatus === 'granted'
                ? 'Allowed'
                : permissionStatus === 'undetermined'
                  ? 'Not set'
                  : 'Blocked'}
            </Text>
          </View>

          {isAndroid && permissionStatus !== 'granted' && (
            <View
              style={[
                styles.permissionCallout,
                {
                  backgroundColor: `${t.warning}12`,
                  borderColor: `${t.warning}40`,
                },
              ]}
            >
              <Text style={[styles.permissionCalloutText, { color: t.textPrimary }]}>
                Some devices (Xiaomi/MIUI) block in-app SMS permission prompts. If requesting fails, grant it manually from system settings.
              </Text>
              <Pressable
                onPress={() => void openSystemSettings()}
                style={[styles.permissionCalloutButton, { backgroundColor: t.primary }]}
              >
                <Text style={styles.permissionCalloutButtonText}>Open App Settings</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleRequestPermission()}
                style={[styles.permissionCalloutButton, styles.permissionCalloutButtonAlt, { borderColor: t.border }]}
              >
                <Text style={[styles.permissionCalloutButtonAltText, { color: t.textPrimary }]}>Request Permission</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={handleRefresh} style={[styles.secondaryButton, { borderColor: t.border }]}>
            <Text style={[styles.secondaryButtonText, { color: t.textPrimary }]}>Refresh Permission</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: t.textPrimary }]}>Pending entries</Text>
              <Text style={[styles.subLabel, { color: t.textSecondary }]}>
                Detected SMS transactions waiting for your confirmation.
              </Text>
            </View>
            {pendingCount !== null && pendingCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: t.primary }]}>
                <Text style={styles.countBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push('/sms/pending')}
            style={[styles.primaryButton, { backgroundColor: pendingCount ? t.primary : t.border }]}
          >
            <Text style={styles.primaryButtonText}>
              {pendingCount ? `Review ${pendingCount} pending` : 'Review pending entries'}
            </Text>
          </Pressable>
        </View>

        <HelpLink
          title="How it works"
          items={[
            'Incoming SMS is parsed locally for amounts, direction, balance and references.',
            'Entries are stored as pending — nothing is added to your transactions until you confirm it.',
            'Parsing is best-effort: always check the amount and wallet before confirming.',
            'Messages are never uploaded or shared.',
            'Requires a development build (not available in Expo Go) and Android.',
            'Xiaomi/MIUI note: SMS permission is often auto-blocked. Grant it manually in App info → Permissions → SMS, or via: adb shell pm grant com.eiteone.pocketflow android.permission.READ_SMS',
          ]}
        />
      </ScrollView>

      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 12,
    paddingBottom: 40,
  },
  contentCompact: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  statusHero: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  statusHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusHeroTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusHeroMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  permissionCallout: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  permissionCalloutText: {
    fontSize: 12,
    lineHeight: 18,
  },
  permissionCalloutButton: {
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },
  permissionCalloutButtonAlt: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  permissionCalloutButtonAltText: {
    fontSize: 13,
    fontWeight: '700',
  },
  permissionCalloutButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
