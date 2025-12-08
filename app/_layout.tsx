import React, { useEffect, useState, useMemo } from 'react';
import { Platform, View, ActivityIndicator, useColorScheme, AppState, AppStateStatus, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useSettings } from '../src/store/useStore';
import { ensureTables } from '../src/lib/db';
import { processRecurringTransactions } from '../src/lib/services/recurringTransactionService';
import { theme, shadows } from '../src/theme/theme';
import { authenticateWithBiometrics, shouldRequireAuth } from '../src/lib/services/biometricService';
import { FingerprintIcon } from '../src/assets/icons/FingerprintIcon';

export default function RootLayout() {
  const { 
    themeMode, 
    biometricEnabled, 
    biometricSetupComplete,
    lastAuthTime,
    setLastAuthTime 
  } = useSettings();
  const systemColorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(Platform.OS === 'web');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
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
          setDbReady(true);
        })
        .catch(err => {
          console.error('Failed to initialize database:', err);
          setDbReady(true); // Still show app even if DB fails
        });
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

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, process recurring transactions
      if (Platform.OS !== 'web') {
        // Clear all caches to ensure fresh data is loaded
        // This prevents stale cached data from being displayed after app resume
        const { invalidateTransactionCaches } = await import('../src/lib/cache/queryCache');
        invalidateTransactionCaches();
        
        await processRecurringTransactions();
      }
      
      if (biometricEnabled && biometricSetupComplete) {
        // Check if auth is needed
        if (shouldRequireAuth(lastAuthTime)) {
          setIsAuthenticated(false);
          performBiometricAuth();
        }
      }
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
        
        {/* Fingerprint Icon */}
        <View style={{ marginBottom: 24 }}>
          <FingerprintIcon size={72} color={t.primary} />
        </View>
        
        <TouchableOpacity 
          onPress={performBiometricAuth}
          style={{ 
            backgroundColor: t.primary, 
            paddingHorizontal: 40, 
            paddingVertical: 16, 
            borderRadius: 12,
            ...shadows.md 
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
            Authenticate
          </Text>
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
      fontWeight: '700',
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

