import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useSettings } from '../src/store/useStore';
import { ensureTables } from '../src/lib/db';

export default function RootLayout() {
  const { themeMode } = useSettings();
  const [dbReady, setDbReady] = useState(Platform.OS === 'web');

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="transactions/add" 
        options={{ 
          presentation: 'modal',
          headerShown: true,
          title: 'Add Transaction'
        }} 
      />
      <Stack.Screen name="transactions/[id]" options={{ headerShown: true, title: 'Transaction Details' }} />
      <Stack.Screen name="transactions/edit" options={{ headerShown: true, title: 'Edit Transaction' }} />
      <Stack.Screen name="transactions/history" options={{ headerShown: true, title: 'History' }} />
      <Stack.Screen name="wallets/create" options={{ headerShown: true, title: 'Create Wallet' }} />
      <Stack.Screen name="wallets/[id]" options={{ headerShown: true, title: 'Wallet Details' }} />
      <Stack.Screen name="categories/create" options={{ headerShown: true, title: 'Create Category' }} />
      <Stack.Screen name="categories/index" options={{ headerShown: true, title: 'Categories' }} />
      <Stack.Screen name="receipt/scan" options={{ headerShown: true, title: 'Scan Receipt' }} />
      <Stack.Screen name="profile/index" options={{ headerShown: true, title: 'Profile' }} />
      <Stack.Screen name="settings/currency" options={{ headerShown: true, title: 'Currency Settings' }} />
      <Stack.Screen name="settings/security" options={{ headerShown: true, title: 'Security Settings' }} />
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
    </Stack>
  );
}

