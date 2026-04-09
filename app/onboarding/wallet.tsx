import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { useOnboarding } from '../../src/store/useOnboarding';
import { OnboardingProgress } from '../../src/components/OnboardingProgress';
import { addWallet } from '../../src/lib/db/wallets';

export default function WalletOnboardingScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const { completeStep } = useOnboarding();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const [walletName, setWalletName] = useState('Cash');
  const [walletType, setWalletType] = useState<'Cash' | 'Bank' | 'Mobile Money'>('Cash');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const selectedColor = useMemo(() => {
    if (walletType === 'Bank') return '#3B82F6';
    if (walletType === 'Mobile Money') return '#10B981';
    return '#F59E0B';
  }, [walletType]);

  const finishOnboarding = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      await addWallet({
        name: walletName.trim() || 'Cash',
        currency: defaultCurrency,
        type: walletType,
        color: selectedColor,
        initial_balance: Number(openingBalance || '0'),
      } as any);
    } catch (error) {
      console.error('Failed to create onboarding wallet:', error);
    } finally {
      completeStep('wallet');
      router.replace('/(tabs)');
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View>
          <OnboardingProgress currentStep={3} totalSteps={3} />
          <Text style={{ color: t.textPrimary, fontSize: 30, fontWeight: '900', marginTop: 32 }}>Create your first wallet</Text>
          <Text style={{ color: t.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 12 }}>
            One wallet is enough to start. You can add the rest later.
          </Text>

          <View style={{ marginTop: 28, gap: 18 }}>
            <View>
              <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Wallet name</Text>
              <TextInput
                value={walletName}
                onChangeText={setWalletName}
                placeholder="Cash"
                placeholderTextColor={t.textSecondary}
                style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: t.textPrimary, fontSize: 16 }}
              />
            </View>

            <View>
              <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Type</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['Cash', 'Bank', 'Mobile Money'] as const).map((item) => {
                  const active = walletType === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setWalletType(item)}
                      style={{ flex: 1, backgroundColor: active ? t.primary : t.card, borderWidth: 1, borderColor: active ? t.primary : t.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : t.textPrimary, fontWeight: '800', fontSize: 12 }}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Opening balance</Text>
              <TextInput
                value={openingBalance}
                onChangeText={setOpeningBalance}
                placeholder="0"
                placeholderTextColor={t.textSecondary}
                keyboardType="numeric"
                style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: t.textPrimary, fontSize: 16 }}
              />
            </View>
          </View>
        </View>

        <View>
          <Pressable onPress={finishOnboarding} style={{ backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{isSaving ? 'Finishing...' : 'Finish setup'}</Text>
          </Pressable>

          <Pressable onPress={() => { completeStep('wallet'); router.replace('/(tabs)'); }} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '700' }}>Skip and finish</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
