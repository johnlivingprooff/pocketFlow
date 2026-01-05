import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { createWallet } from '../../src/lib/db/wallets';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { useColorScheme } from 'react-native';

const WALLET_TYPES = ['Cash', 'Bank', 'Mobile Money', 'Crypto', 'Investment', 'Other'];

export default function WalletTutorialScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const { setCurrentStep, completeStep, previousSteps, goBackToPreviousStep } = useOnboarding();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  const stepRoutes: Record<string, string> = {
    welcome: '/onboarding/welcome',
    profile: '/onboarding/profile',
    wallet: '/onboarding/wallet',
    category: '/onboarding/category',
    budget: '/onboarding/budget',
    goal: '/onboarding/goal',
    transaction: '/onboarding/transaction',
    transfer: '/onboarding/transfer',
    analytics: '/onboarding/analytics',
  };

  const handleBack = () => {
    const prevStep = previousSteps[previousSteps.length - 1];
    if (prevStep && stepRoutes[prevStep]) {
      goBackToPreviousStep();
      router.push(stepRoutes[prevStep]);
    }
  };

  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<string>('Cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your wallet.');
      return;
    }

    const balance = parseFloat(initialBalance) || 0;
    if (balance < 0) {
      Alert.alert('Invalid Amount', 'Initial balance cannot be negative.');
      return;
    }

    setIsCreating(true);
    try {
      await createWallet({
        name: walletName.trim(),
        type: walletType as any,
        currency: defaultCurrency,
        initial_balance: balance,
      });

      completeStep('wallet');
      setCurrentStep('category');
      router.push('/onboarding/category');
    } catch (error) {
      console.error('Failed to create wallet:', error);
      Alert.alert('Error', 'Could not create wallet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingHeader 
          canGoBack={previousSteps.length > 0}
          onBack={handleBack}
        />

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '25%', backgroundColor: colors.deepGold }]} />
          </View>
          <Text style={[styles.progressText, { color: t.textSecondary }]}>
            Step 2 of 8
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🏦</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Create Your First Wallet
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            A wallet can be cash, bank account, mobile money, or any place you keep money
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Wallet Name <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  color: t.textPrimary,
                  borderColor: colors.mutedGrey + '30',
                },
              ]}
              placeholder="e.g., Main Cash, TNM Mpamba, NBS Bank"
              placeholderTextColor={t.textSecondary}
              value={walletName}
              onChangeText={setWalletName}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Wallet Type
            </Text>
            <View style={styles.typeGrid}>
              {WALLET_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: walletType === type ? colors.deepGold + '20' : colors.mutedGrey + '10',
                      borderColor: walletType === type ? colors.deepGold : colors.mutedGrey + '30',
                    },
                  ]}
                  onPress={() => setWalletType(type)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      {
                        color: walletType === type ? colors.deepGold : t.textPrimary,
                        fontWeight: walletType === type ? '700' : '500',
                      },
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Initial Balance ({defaultCurrency})
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  color: t.textPrimary,
                  borderColor: colors.mutedGrey + '30',
                },
              ]}
              placeholder="0"
              placeholderTextColor={t.textSecondary}
              value={initialBalance}
              onChangeText={setInitialBalance}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.helperText, { color: t.textSecondary }]}>
              How much money is currently in this wallet?
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: colors.deepGold, opacity: isCreating ? 0.6 : 1 },
              shadows.md,
            ]}
            onPress={handleCreateWallet}
            disabled={isCreating}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isCreating ? 'Creating...' : 'Create Wallet'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 13,
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
