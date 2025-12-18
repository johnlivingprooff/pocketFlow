import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Platform, View, ActivityIndicator, useColorScheme, AppState, AppStateStatus, Text, TouchableOpacity, StyleSheet, Image, TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useSettings } from '../src/store/useStore';
import { ensureTables } from '../src/lib/db';
import { startDatabaseHealthCheck, stopDatabaseHealthCheck } from '../src/lib/db/healthCheck';
import { on as onEvent, off as offEvent } from '../src/lib/events/eventBus';
import { warn as logWarn } from '../src/utils/logger';
import { processRecurringTransactions } from '../src/lib/services/recurringTransactionService';
import { theme, shadows } from '../src/theme/theme';
import { authenticateWithBiometrics, shouldRequireAuth } from '../src/lib/services/biometricService';
import { FingerprintIcon } from '../src/assets/icons/FingerprintIcon';
import { createBackup } from '../src/lib/export/backupRestore';

export default function RootLayout() {
  const { 
    themeMode, 
    biometricEnabled, 
    biometricSetupComplete,
    lastAuthTime,
    lastBackupAt,
    setLastAuthTime,
    setLastBackupAt,
  } = useSettings();
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
      ensureTables()
        .then(async () => {
          // Process recurring transactions after DB is ready
          await processRecurringTransactions();
          await maybeRunAutoBackup();
          setDbReady(true);
          // Start passive DB health monitoring (logs only)
          startDatabaseHealthCheck(60000);
        })
        .catch(err => {
          console.error('Failed to initialize database:', err);
          setDbReady(true); // Still show app even if DB fails
        });
      // Subscribe to fatal DB signals and log (no UI impact)
      const unsubscribe = onEvent('db:fatal', (payload) => {
        logWarn('[App] DB fatal signal received', payload as any);
      });
      return () => {
        // Cleanup on unmount
        try { stopDatabaseHealthCheck(); } catch {}
        unsubscribe?.();
      };
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


  useEffect(() => {
    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [biometricEnabled, biometricSetupComplete, lastAuthTime]);

  // FIX: Make the event handler synchronous, and call async logic separately
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    handleAppStateChangeAsync(nextAppState);
  };

  const handleAppStateChangeAsync = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, process recurring transactions
      if (Platform.OS !== 'web') {
        // Clear all caches to ensure fresh data is loaded
        // This prevents stale cached data from being displayed after app resume
        const { invalidateTransactionCaches } = await import('../src/lib/cache/queryCache');
        invalidateTransactionCaches();
        await processRecurringTransactions();
        await maybeRunAutoBackup();
      }
      if (biometricEnabled && biometricSetupComplete) {
        // Check if auth is needed
        if (shouldRequireAuth(lastAuthTime)) {
          setIsAuthenticated(false);
          performBiometricAuth();
        }
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // ✅ FIX: Flush write queue before backgrounding to reduce mid-write kill loss
      // This awaits all pending database operations before the app suspends
      console.log('[App] App entering background state, flushing write queue...');
      if (Platform.OS !== 'web') {
        await flushWriteQueue();
        console.log('[App] Write queue flushed before background');
      }
      // Force re-auth on next launch after the app is backgrounded/closed
      setLastAuthTime(null);
      setIsAuthenticated(false);
    }
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

  // Show biometric auth screen if not authenticated
  if (!isAuthenticated && biometricEnabled && biometricSetupComplete) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background, padding: 32 }}>
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
    );
  }

  // Define common header style options based on theme
  const headerOptions = {
    headerStyle: {
      backgroundColor: t.background,
    },
    headerTintColor: t.textPrimary,
    headerTitleStyle: {
      color: t.textPrimary,
      fontWeight: '700' as TextStyle['fontWeight'],
    },
    headerShadowVisible: false,
  };

  return (
    <GestureHandlerRootView style={styles.container}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="transactions/add" 
        options={{ 
          presentation: 'modal',
          headerShown: true,
          title: 'Add Transaction',
          ...headerOptions,
        }} 
      />
      <Stack.Screen name="transactions/[id]" options={{ headerShown: true, title: 'Transaction Details', ...headerOptions }} />
      <Stack.Screen name="transactions/edit" options={{ headerShown: true, title: 'Edit Transaction', ...headerOptions }} />
      <Stack.Screen name="transactions/history" options={{ headerShown: true, title: 'History', ...headerOptions }} />
      <Stack.Screen name="wallets/create" options={{ headerShown: true, title: 'Create Wallet', ...headerOptions }} />
      <Stack.Screen name="wallets/[id]" options={{ headerShown: true, title: 'Wallet Details', ...headerOptions }} />
      <Stack.Screen name="categories/create" options={{ headerShown: true, title: 'Create Category', ...headerOptions }} />
      <Stack.Screen name="categories/index" options={{ headerShown: true, title: 'Categories', ...headerOptions }} />
      <Stack.Screen name="receipt/scan" options={{ headerShown: true, title: 'Scan Receipt', ...headerOptions }} />
      <Stack.Screen name="profile/index" options={{ headerShown: true, title: 'Profile', ...headerOptions }} />
      <Stack.Screen name="settings/currency" options={{ headerShown: true, title: 'Currency Settings', ...headerOptions }} />
      <Stack.Screen name="settings/security" options={{ headerShown: true, title: 'Security Settings', ...headerOptions }} />
      <Stack.Screen name="budget/index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
    </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

