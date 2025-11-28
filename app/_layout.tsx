import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useSettings } from '../src/store/useStore';
import { ensureTables } from '../src/lib/db';

export default function Layout() {
  const { themeMode } = useSettings();
  useEffect(() => {
    // SQLite only works on native platforms
    if (Platform.OS !== 'web') {
      ensureTables();
    }
  }, []);
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'pocketFlow' }} />
    </Stack>
  );
}
