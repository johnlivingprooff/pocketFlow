import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Platform, View, ActivityIndicator, useColorScheme, AppState, AppStateStatus, Text, TouchableOpacity, StyleSheet, Image, TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSettings, useUI } from '../src/store/useStore';
import { useOnboarding } from '../src/store/useOnboarding';
import { ensureTables, initDb } from '../src/lib/db';
// Removed legacy write queue import (migrated to Nitro SQLite)
import { processRecurringTransactions } from '../src/lib/services/recurringTransactionService';
import * as Notifications from 'expo-notifications';
import {
  extractReminderDeepLink,
  markReminderDeliveredFromNotification,
  runReminderRuntimeGateCheck,
  syncReminderPermissionStatus,
} from '../src/lib/services/reminderNotificationService';
import { log } from '../src/utils/logger';
import { runSmsRuntimeGateCheck } from '../src/lib/services/smsTransactionService';
import { theme, shadows } from '../src/theme/theme';
import { authenticateWithBiometrics, shouldRequireAuth } from '../src/lib/services/biometricService';
import { FingerprintIcon } from '../src/assets/icons/FingerprintIcon';
import { createBackup } from '../src/lib/export/backupRestore';
import { WebShell } from '../src/components/web/WebShell';
import { hydrateCloudSession } from '../src/lib/services/cloud/authService';
import { pushProfileToCloud, restoreProfileIfFreshInstall } from '../src/lib/services/cloud/profileService';

export default function RootLayout() {
  const {
    themeMode,
    biometricEnabled,
    biometricSetupComplete,
    lastAuthTime,
    lastBackupAt,
    imagePickingStartTime,
    cloudSessionState,
    setLastAuthTime,
    setLastBackupAt,
    setImagePickingStartTime,
  } = useSettings();
  const { isOnboardingComplete, hasCompletedOnboarding, completedSteps } = useOnboarding();
  const { isPickingImage } = useUI();
  const router = useRouter();
  const segments = useSegments();
  const systemColorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const [storesHydrated, setStoresHydrated] = useState(false);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const backupInProgressRef = useRef(false);

  const t = useMemo(() => {
    const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
    return theme(effectiveMode);
  }, [themeMode, systemColorScheme]);

  // Wait for both persisted stores before making auth/onboarding decisions.
  // Reading them on the first render would use defaults (biometric off,
  // onboarding incomplete) and can flash the app open before the lock appears.
  useEffect(() => {
    let mounted = true;
    const checkHydration = () => {
      if (
        mounted &&
        useSettings.persist.hasHydrated() &&
        useOnboarding.persist.hasHydrated()
      ) {
        setStoresHydrated(true);
      }
    };
    checkHydration();
    const unsubSettings = useSettings.persist.onFinishHydration(checkHydration);
    const unsubOnboarding = useOnboarding.persist.onFinishHydration(checkHydration);
    return () => {
      mounted = false;
      unsubSettings();
      unsubOnboarding();
    };
  }, []);

  // Cloud session/profile work must not race table creation or persisted
  // settings rehydration.
  useEffect(() => {
    if (!storesHydrated || !dbReady) return;
    let mounted = true;
    hydrateCloudSession()
      .then(() => (mounted ? restoreProfileIfFreshInstall() : undefined))
      // Ensure the profile row exists for already-logged-in users
      // (the push is auth-gated and a no-op when not signed in)
      .then(() => (mounted ? pushProfileToCloud() : undefined))
      .catch(() => {
        // best effort
      })
      .finally(() => {
        if (mounted) setCloudHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [storesHydrated, dbReady]);

  // Full sync for shared wallets (app ↔ cloud ↔ web)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!storesHydrated || !cloudHydrated) return;
    if (cloudSessionState !== 'authenticated') return;
    if (!dbReady) return;
    void import('../src/lib/services/cloud/syncService').then((m) => m.syncAllSharedWallets().catch(() => {}));
  }, [cloudSessionState, dbReady, storesHydrated, cloudHydrated]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setDbError(null);
        await initDb();
        await ensureTables();
        if (!mounted) return;
        log(Platform.OS === 'web'
          ? '[App] Initialization complete (web – shared wallets only)'
          : '[App] Database initialized');
        // Never fail open: if the DB is broken, show a recoverable error
        // instead of rendering screens against an uninitialized database.
        setDbReady(true);
      } catch (err: unknown) {
        if (!mounted) return;
        console.error('Failed to initialize database:', err);
        setDbError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [initAttempt]);

  // Native-only post-init work waits for both the DB and persisted settings.
  // In particular, the reminder self-heal must not cancel a valid alarm because
  // remindersEnabled was still its default `false` during rehydration.
  useEffect(() => {
    if (Platform.OS === 'web' || !storesHydrated || !dbReady) return;
    let cancelled = false;
    (async () => {
      try {
        // Independent startup work runs concurrently; a slow recurring batch
        // must not delay the reminder self-heal.
        const [permissionStatus] = await Promise.all([
          syncReminderPermissionStatus(),
          processRecurringTransactions(),
        ]);
        if (cancelled) return;
        await runReminderRuntimeGateCheck(permissionStatus);
        if (cancelled) return;
        await Promise.allSettled([runSmsRuntimeGateCheck(), maybeRunAutoBackup()]);
        log('[App] Initialization complete (native)');
      } catch (err) {
        console.error('[App] Native initialization error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storesHydrated, dbReady]);

  useEffect(() => {
    // Check if biometric auth is needed on mount
    if (!storesHydrated || !dbReady) return;
    if (biometricEnabled && biometricSetupComplete) {
      // Read the persisted value at decision time rather than adding it to
      // the deps: backgrounding clears it and would re-trigger this prompt.
      if (shouldRequireAuth(useSettings.getState().lastAuthTime)) {
        performBiometricAuth();
      } else {
        setIsAuthenticated(true);
      }
    } else {
      setIsAuthenticated(true);
    }
  }, [biometricEnabled, biometricSetupComplete, storesHydrated, dbReady]);

  // Handle onboarding redirection
  useEffect(() => {
    if (!dbReady || !isAuthenticated || !storesHydrated) return;

    const inOnboarding = segments[0] === 'onboarding';
    const onboardingComplete = isOnboardingComplete || hasCompletedOnboarding || completedSteps.includes('wallet');

    if (!onboardingComplete && !inOnboarding) {
      router.replace('/onboarding/welcome');
    } else if (onboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isOnboardingComplete, hasCompletedOnboarding, completedSteps, segments, dbReady, isAuthenticated, storesHydrated]);

  useEffect(() => {
    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [biometricEnabled, biometricSetupComplete, lastAuthTime, storesHydrated, dbReady]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      markReminderDeliveredFromNotification(notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      markReminderDeliveredFromNotification(response.notification);
      const deepLink = extractReminderDeepLink(response);
      if (deepLink) router.push(deepLink as never);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (!storesHydrated || !dbReady) return;
    if (nextAppState === 'active') {
      // Re-lock immediately on resume; don't make the user wait for native
      // notification/OS checks that are unrelated to authentication.
      if (biometricEnabled && biometricSetupComplete) {
        if (!shouldSkipAuthForImagePicking() && shouldRequireAuth(lastAuthTime)) {
          setIsAuthenticated(false);
          performBiometricAuth();
        }
      }

      if (Platform.OS !== 'web') {
        const { invalidateTransactionCaches } = await import('../src/lib/cache/queryCache');
        invalidateTransactionCaches();

        // These checks are independent. Run them together so a slow
        // notification bridge cannot hold up backup or SMS processing.
        await Promise.allSettled([
          processRecurringTransactions(),
          runReminderRuntimeGateCheck(),
          runSmsRuntimeGateCheck(),
          maybeRunAutoBackup(),
        ]);
        // Sync shared wallets on foreground (pull web changes)
        if (useSettings.getState().cloudSessionState === 'authenticated') {
          void import('../src/lib/services/cloud/syncService').then((m) => m.syncAllSharedWallets().catch(() => {}));
        }
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      if (Platform.OS !== 'web') {
        try {
          const { flushWriteQueue } = await import('../src/lib/db/writeQueue');
          await flushWriteQueue();
        } catch (e) {
          console.warn('[App] Failed to flush write queue on background:', e);
        }
      }
      setLastAuthTime(null);
      setIsAuthenticated(false);
    }
  };

  const shouldSkipAuthForImagePicking = (): boolean => {
    if (!imagePickingStartTime) return false;

    // Skip authentication for 2 minutes after image picking starts
    // This covers the time spent in camera/gallery interface and processing
    const IMAGE_PICKING_AUTH_DELAY = 2 * 60 * 1000; // 2 minutes
    const timeSinceImagePickingStarted = Date.now() - imagePickingStartTime;

    return timeSinceImagePickingStarted < IMAGE_PICKING_AUTH_DELAY;
  };

  const performBiometricAuth = async () => {
    setAuthError(null);
    const result = await authenticateWithBiometrics('Authenticate to access PocketFlow');

    if (result.success) {
      setIsAuthenticated(true);
      setLastAuthTime(Date.now());
      setAuthError(null);
    } else {
      setAuthError(result.error || 'Authentication failed');
    }
  };

  const shouldRunAutoBackup = (lastBackup: number | null) => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / msPerDay);
    const hasBackupThisMonth = lastBackup
      ? (() => {
        const last = new Date(lastBackup);
        return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();
      })()
      : false;
    return daysLeft <= 5 && !hasBackupThisMonth;
  };

  const maybeRunAutoBackup = async () => {
    if (Platform.OS === 'web') return;
    if (backupInProgressRef.current) return;
    if (!shouldRunAutoBackup(lastBackupAt)) return;
    backupInProgressRef.current = true;
    try {
      const result = await createBackup();
      if (result.success && result.uri) {
        setLastBackupAt(Date.now());
        console.log('[AutoBackup] Backup created at', result.uri);
        await maybeUploadAutoBackupToDrive(result.uri);
      } else {
        console.warn('[AutoBackup] Backup failed:', result.error);
      }
    } catch (error) {
      console.error('[AutoBackup] Unexpected error creating backup:', error);
    } finally {
      backupInProgressRef.current = false;
    }
  };

  const maybeUploadAutoBackupToDrive = async (backupUri: string) => {
    const settings = useSettings.getState();
    if (!settings.driveAccount || !settings.driveAutoBackupEnabled) return;
    try {
      const { uploadExistingBackupToDrive } =
        await import('../src/lib/services/drive/driveBackupService');
      const remote = await uploadExistingBackupToDrive(backupUri);
      useSettings.getState().setDriveLastSyncAt(Date.now());
      console.log('[AutoBackup] Encrypted backup uploaded to Drive:', remote.name);
    } catch (err) {
      const skipSilently =
        err instanceof Error &&
        err.name === 'DriveBackupError' &&
        (err as { code?: string }).code === 'drive_no_passphrase';
      if (skipSilently) {
        console.warn('[AutoBackup] Drive upload skipped: passphrase not set');
      } else {
        console.warn('[AutoBackup] Drive upload failed:', err instanceof Error ? err.message : String(err));
      }
    }
  };

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background, padding: 32 }}>
        <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
          We couldn&apos;t open your data
        </Text>
        <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }} numberOfLines={4}>
          {dbError}
        </Text>
        <TouchableOpacity
          onPress={() => setInitAttempt((attempt) => attempt + 1)}
          accessibilityRole="button"
          accessibilityLabel="Retry opening the database"
          style={{ backgroundColor: t.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 }}
        >
          <Text style={{ color: t.background, fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background }}>
        <ActivityIndicator size="large" color={t.primary} />
        <Text style={{ color: t.textSecondary, marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  const renderStack = () => (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="transactions/add"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Add Transaction',
          headerStyle: {
            backgroundColor: t.background,
          },
          headerTintColor: t.textPrimary,
          headerTitleStyle: {
            color: t.textPrimary,
            fontWeight: '700' as TextStyle['fontWeight'],
          },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="transactions/[id]" options={{
        headerShown: true,
        title: 'Transaction Details',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="transactions/edit" options={{
        headerShown: true,
        title: 'Edit Transaction',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="transactions/history" options={{
        headerShown: true,
        title: 'History',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="wallets/create" options={{
        headerShown: true,
        title: 'Create Wallet',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="wallets/[id]" options={{
        headerShown: true,
        title: 'Wallet Details',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="categories/create" options={{
        headerShown: true,
        title: 'Create Category',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="categories/index" options={{
        headerShown: true,
        title: 'Categories',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="receipt/scan" options={{
        headerShown: true,
        title: 'Scan Receipt',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="profile/index" options={{
        headerShown: true,
        title: 'Profile',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="settings/currency" options={{
        headerShown: true,
        title: 'Currency Settings',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="settings/security" options={{
        headerShown: true,
        title: 'Security Settings',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="settings/drive-backup" options={{
        headerShown: true,
        title: 'Drive Backup',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="budget/index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/welcome" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/profile" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/reminders" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/wallet" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/category" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/budget" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/goal" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/transaction" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/transfer" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/analytics" options={{ headerShown: false }} />
      <Stack.Screen name="settings/reminders" options={{
        headerShown: true,
        title: 'Reminder Settings',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="settings/sms-monitoring" options={{
        headerShown: true,
        title: 'SMS Auto-Log',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="sms/pending" options={{
        headerShown: true,
        title: 'Pending SMS Entries',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="settings/shared-wallets" options={{
        headerShown: true,
        title: 'Shared Wallets',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="settings/shared-wallets/[id]" options={{
        headerShown: true,
        title: 'Shared Wallet Details',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
      <Stack.Screen name="invite/[token]" options={{
        headerShown: true,
        title: 'Invitation',
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerTitleStyle: {
          color: t.textPrimary,
          fontWeight: '700' as TextStyle['fontWeight'],
        },
        headerShadowVisible: false,
      }} />
    </Stack>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      {Platform.OS === 'web' ? (
        <WebShell>
          {renderStack()}
        </WebShell>
      ) : (
        renderStack()
      )}

      {/* Show biometric auth overlay if not authenticated */}
      {!isAuthenticated && biometricEnabled && biometricSetupComplete && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.background, justifyContent: 'center', alignItems: 'center', padding: 32, zIndex: 1000 }]}>
          {/* App Logo */}
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 120, height: 120, marginBottom: 24 }}
            resizeMode="contain"
          />

          <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
            pocketFlow
          </Text>

          <Text style={{ color: t.textSecondary, fontSize: 16, marginBottom: 48, textAlign: 'center' }}>
            Your personal finance tracker
          </Text>

          {authError && (
            <Text style={{ color: t.danger, fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
              {authError}
            </Text>
          )}

          {/* Fingerprint Icon as the authenticate button (no background) */}
          <TouchableOpacity
            onPress={performBiometricAuth}
            accessibilityRole="button"
            accessibilityLabel="Authenticate with biometrics"
            style={{ marginBottom: 24 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FingerprintIcon size={72} color={t.primary} />
          </TouchableOpacity>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
