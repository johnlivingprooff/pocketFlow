import React, { useEffect, useState, useMemo } from 'react';
import { Platform, View, ActivityIndicator, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { useSettings } from '../src/store/useStore';
import { ensureTables } from '../src/lib/db';
import { theme } from '../src/theme/theme';

export default function RootLayout() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(Platform.OS === 'web');
  
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

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#006D5B" />
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

