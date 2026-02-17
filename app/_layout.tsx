import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Platform, View, ActivityIndicator, useColorScheme, AppState, AppStateStatus, Text, TouchableOpacity, StyleSheet, Image, TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSettings } from '../src/store/useStore';
import { useUI } from '../src/store/useStore';
import { useOnboarding } from '../src/store/useOnboarding';
import { ensureTables, initDb } from '../src/lib/db';
// Removed legacy write queue import (migrated to Nitro SQLite)
import { processRecurringTransactions } from '../src/lib/services/recurringTransactionService';
import {
  extractReminderDeepLink,
  initializeReminderNotifications,
  runReminderRuntimeGateCheck,
} from '../src/lib/services/reminderNotificationService';
import { log } from '../src/utils/logger';
import { theme, shadows } from '../src/theme/theme';
import { authenticateWithBiometrics, shouldRequireAuth } from '../src/lib/services/biometricService';
import { FingerprintIcon } from '../src/assets/icons/FingerprintIcon';
import { createBackup } from '../src/lib/export/backupRestore';
import { WebShell } from '../src/components/web/WebShell';

export default function RootLayout() {
  const { 
    themeMode, 
    biometricEnabled, 
    biometricSetupComplete,
    lastAuthTime,
    lastBackupAt,
    imagePickingStartTime,
    setLastAuthTime,
    setLastBackupAt,
    setImagePickingStartTime,
  } = useSettings();
  const { isOnboardingComplete } = useOnboarding();
  const { isPickingImage } = useUI();
  const router = useRouter();
  const segments = useSegments();
  const systemColorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(Platform.OS === 'web');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const backupInProgressRef = useRef(false);
  
  const t = useMemo(() => {
    const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
    return theme(effectiveMode);
  }, [themeMode, systemColorScheme]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          await initDb();
          await ensureTables();
          // Process recurring transactions after DB is ready
          await processRecurringTransactions();
          // Reuse existing startup task hook (used by recurring processing) to gate reminders.
          await initializeReminderNotifications();
          await runReminderRuntimeGateCheck('app_start');
          await maybeRunAutoBackup();
          setDbReady(true);
        } catch (err: unknown) {
          console.error('Failed to initialize database:', err);
          setDbReady(true); // Still show app even if DB fails
        }
      })();
    }
  }, []);

  useEffect(() => {
    // Check if biometric auth is needed on mount
    if (biometricEnabled && biometricSetupComplete && dbReady) {
      if (shouldRequireAuth(lastAuthTime)) {
        performBiometricAuth();
      } else {
        setIsAuthenticated(true);
      }
    } else {
      setIsAuthenticated(true);
    }
  }, [biometricEnabled, biometricSetupComplete, dbReady]);

  // Handle onboarding redirection
  useEffect(() => {
    if (!dbReady || !isAuthenticated) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!isOnboardingComplete && !inOnboarding) {
      // User hasn't completed onboarding, redirect to onboarding
      router.replace('/onboarding/welcome');
    } else if (isOnboardingComplete && inOnboarding) {
      // User has completed onboarding but is still on onboarding screen, go to main app
      router.replace('/(tabs)');
    }
  }, [isOnboardingComplete, segments, dbReady, isAuthenticated]);

  useEffect(() => {
    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [biometricEnabled, biometricSetupComplete, lastAuthTime]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
      const deepLink = extractReminderDeepLink(response);
      if (!deepLink) {
        return;
      }
      router.push(deepLink as never);
      }
    );

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        log('[Reminder] Notification received', {
          isReminder: notification.request.content.data?.kind === 'expense_log_reminder',
        });
      }
    );

    return () => subscription.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, process recurring transactions
      if (Platform.OS !== 'web') {
        // Clear all caches to ensure fresh data is loaded
        // This prevents stale cached data from being displayed after app resume
        const { invalidateTransactionCaches } = await import('../src/lib/cache/queryCache');
        invalidateTransactionCaches();
        
        await processRecurringTransactions();
        // Reuse existing app-resume lifecycle gate to keep reminder scheduling deterministic.
        await runReminderRuntimeGateCheck('app_active');
        await maybeRunAutoBackup();
      }
      
      if (biometricEnabled && biometricSetupComplete) {
        // Check if auth is needed, but skip if user recently started picking an image
        if (!shouldSkipAuthForImagePicking() && shouldRequireAuth(lastAuthTime)) {
          setIsAuthenticated(false);
          performBiometricAuth();
        }
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // No write queue flush needed with Nitro SQLite (atomic writes)
      // [App] App entering background state, Nitro SQLite handles atomicity.
      
      // Force re-auth on next launch after the app is backgrounded/closed
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
      if (result.success) {
        setLastBackupAt(Date.now());
        console.log('[AutoBackup] Backup created at', result.uri);
      } else {
        console.warn('[AutoBackup] Backup failed:', result.error);
      }
    } catch (error) {
      console.error('[AutoBackup] Unexpected error creating backup:', error);
    } finally {
      backupInProgressRef.current = false;
    }
  };

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

