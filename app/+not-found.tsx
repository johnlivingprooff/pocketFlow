import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { useScaledFontSizes } from '@/theme/fontScale';

const TAP_OPACITY = 0.7;

function NotFoundIcon({ size = 96, color = '#14B8A6' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="24" r="20" stroke={color} strokeWidth="2.5" />
      <G stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M30 18 26.5 26.5 18 30l3.5-8.5Z" />
        <Path d="M24 20v1.5M20 24h1.5M28 24h1.5" />
      </G>
      <Circle cx="24" cy="24" r="1.5" fill={color} />
    </Svg>
  );
}

export default function NotFoundScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const fs = useScaledFontSizes();
  const router = useRouter();

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.safeArea, { backgroundColor: t.background }]) as any}>
      <View style={styles.content}>
        <NotFoundIcon color={t.primary} />
        <Text style={StyleSheet.flatten([styles.title, { color: t.textPrimary, fontSize: fs['4xl'] }]) as any}>404</Text>
        <Text style={StyleSheet.flatten([styles.heading, { color: t.textPrimary, fontSize: fs.xl }]) as any}>Page Not Found</Text>
        <Text style={StyleSheet.flatten([styles.subtitle, { color: t.textSecondary, fontSize: fs.base }]) as any}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </Text>
        <TouchableOpacity
          activeOpacity={TAP_OPACITY}
          onPress={() => router.replace('/')}
          style={StyleSheet.flatten([styles.button, { backgroundColor: t.primary }]) as any}
        >
          <Text style={StyleSheet.flatten([styles.buttonLabel, { color: '#FFFFFF', fontSize: fs.base }]) as any}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 8,
  },
  heading: {
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.85,
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonLabel: {
    fontWeight: '700',
  },
});