import React from 'react';
import { View, Text, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { OnboardingProgress } from '../../src/components/OnboardingProgress';

export default function WelcomeOnboardingScreen() {
  const router = useRouter();
  const { themeMode } = useSettings();
  const { completeStep, skipStep } = useOnboarding();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View>
          <OnboardingProgress currentStep={1} totalSteps={3} />
          <View style={{ marginTop: 40 }}>
            <Text style={{ color: t.textPrimary, fontSize: 34, fontWeight: '900', lineHeight: 40 }}>Track money without slowing down.</Text>
            <Text style={{ color: t.textSecondary, fontSize: 16, lineHeight: 24, marginTop: 16 }}>
              pocketFlow is built for fast daily logging. We’ll set up your basics in about three short steps.
            </Text>
          </View>

          <View style={{ marginTop: 32, gap: 12 }}>
            {[
              'One-tap expense and income entry',
              'Smart defaults for wallet and category',
              'Clear history and lightweight insights',
            ].map((item) => (
              <View key={item} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '700' }}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Pressable
            onPress={() => {
              completeStep('welcome');
              router.replace('/onboarding/profile');
            }}
            style={{ backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Get started</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              skipStep('welcome');
              router.replace('/onboarding/profile');
            }}
            style={{ paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
          >
            <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '700' }}>Skip intro</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
