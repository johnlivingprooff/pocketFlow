import React from 'react';
import { View, Text, TouchableOpacity, Linking, useColorScheme, Platform } from 'react-native';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';
import { WEB_APP_STORE_URL } from '@/lib/platform/webGuards';

interface AppOnlyBlockProps {
  title?: string;
  message?: string;
  showDownloadCTA?: boolean;
}

export function AppOnlyBlock({
  title = 'Available on the pocketFlow app',
  message = 'This feature is local-first and only available on Android / iOS. Shared wallets are the only feature that works on the web.',
  showDownloadCTA = true,
}: AppOnlyBlockProps) {
  if (Platform.OS !== 'web') return null;

  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  return (
    <View
      style={{
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 20,
        gap: 10,
      }}
    >
      <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>{message}</Text>
      {showDownloadCTA ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(WEB_APP_STORE_URL)}
          style={{
            marginTop: 8,
            backgroundColor: t.primary,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Get the app</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 4 }}>
        On the web you can sign in, view and edit shared wallets, create invites and add transactions to shared wallets.
      </Text>
    </View>
  );
}

export function WebAuthWall({
  title = 'Sign in required',
  message = 'Create a cloud account or sign in to use shared wallets. Accounts are mandatory for shared wallets on the web.',
  ctaLabel = 'Go to Profile',
  onPress,
}: {
  title?: string;
  message?: string;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  return (
    <View
      style={{
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 20,
        gap: 10,
      }}
    >
      <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>{message}</Text>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          style={{
            marginTop: 8,
            backgroundColor: t.primary,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
