import React, { useEffect, useState, useMemo } from 'react';
import { Platform, View, ActivityIndicator, useColorScheme, AppState, AppStateStatus, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useSettings } from '../src/store/useStore';
import { ensureTables } from '../src/lib/db';
import { theme, shadows } from '../src/theme/theme';
import { authenticateWithBiometrics, shouldRequireAuth } from '../src/lib/services/biometricService';

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
        .then(() => setDbReady(true))
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

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && biometricEnabled && biometricSetupComplete) {
      // App came to foreground, check if auth is needed
      if (shouldRequireAuth(lastAuthTime)) {
        setIsAuthenticated(false);
        performBiometricAuth();
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
        <View style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 40, 
          backgroundColor: t.primary, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginBottom: 24,
          ...shadows.lg 
        }}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
        </View>
        
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
          PocketFlow
        </Text>
        
        <Text style={{ color: t.textSecondary, fontSize: 16, marginBottom: 32, textAlign: 'center' }}>
          Authenticate to continue
        </Text>
        
        {authError && (
          <Text style={{ color: t.danger, fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
            {authError}
          </Text>
        )}
        
        <TouchableOpacity 
          onPress={performBiometricAuth}
          style={{ 
            backgroundColor: t.primary, 
            paddingHorizontal: 32, 
            paddingVertical: 14, 
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
  );
}

