import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { useOnboarding } from '../../src/store/useOnboarding';
import { OnboardingProgress } from '../../src/components/OnboardingProgress';

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const { themeMode, userInfo, setUserInfo } = useSettings();
  const { completeStep } = useOnboarding();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const [name, setName] = useState(userInfo?.name === 'User' ? '' : (userInfo?.name || ''));
  const [currency, setCurrency] = useState('MWK');

  const handleContinue = () => {
    setUserInfo({ name: name.trim() || 'pFlowr' });
    useSettings.getState().setDefaultCurrency(currency);
    completeStep('profile');
    router.replace('/onboarding/wallet');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View>
          <OnboardingProgress currentStep={2} totalSteps={3} />
          <Text style={{ color: t.textPrimary, fontSize: 30, fontWeight: '900', marginTop: 32 }}>Set your basics</Text>
          <Text style={{ color: t.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 12 }}>
            Just enough to personalize the app and make amounts feel right from day one.
          </Text>

          <View style={{ marginTop: 28 }}>
            <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>What should we call you?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={t.textSecondary}
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: t.textPrimary,
                fontSize: 16,
              }}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Default currency</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['MWK', 'USD', 'ZAR'].map((item) => {
                const active = currency === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCurrency(item)}
                    style={{
                      flex: 1,
                      backgroundColor: active ? t.primary : t.card,
                      borderWidth: 1,
                      borderColor: active ? t.primary : t.border,
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: active ? '#FFFFFF' : t.textPrimary, fontWeight: '800' }}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <Pressable onPress={handleContinue} style={{ backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
