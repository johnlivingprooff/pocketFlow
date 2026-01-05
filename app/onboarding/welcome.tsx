import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows } from '../../src/theme/theme';
import { colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { WalletIcon, ChartIcon, SettingsIcon } from '../../src/assets/icons/CategoryIcons';

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  themeColors: ReturnType<typeof theme>;
}

function FeatureItem({ icon, title, description, themeColors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.deepGold + '10' }]}>
        {icon}
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: themeColors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription, { color: themeColors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const { setCurrentStep, completeStep, skipOnboarding } = useOnboarding();
  const router = useRouter();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [isSkipping, setIsSkipping] = useState(false);

  const handleStart = () => {
    completeStep('welcome');
    setCurrentStep('profile');
    router.push('/onboarding/profile');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can complete the setup later from Settings. You\'ll need to create at least one wallet and category to get started.',
      [
        {
          text: 'Cancel',
          onPress: () => setIsSkipping(false),
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: async () => {
            setIsSkipping(true);
            skipOnboarding();
            router.replace('/(tabs)');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={[styles.logoContainer, { backgroundColor: colors.deepGold + '20' }]}>
            <Text style={styles.logoEmoji}>💰</Text>
          </View>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Welcome to pocketFlow
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Your offline-first personal finance companion
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.features}>
          <FeatureItem 
            icon={<WalletIcon size={24} color={colors.deepGold} />}
            title="Multiple Wallets"
            description="Track cash, bank accounts, and crypto all in one place"
            themeColors={t}
          />
          <FeatureItem 
            icon={<ChartIcon size={24} color={colors.deepGold} />}
            title="Smart Analytics"
            description="Visualize your spending and income patterns"
            themeColors={t}
          />
          <FeatureItem 
            icon={<SettingsIcon size={24} color={colors.deepGold} />}
            title="Budgets & Goals"
            description="Set financial targets and track your progress"
            themeColors={t}
          />
          <FeatureItem 
            icon={<View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>🔒</Text></View>}
            title="Offline & Private"
            description="All your data stays on your device"
            themeColors={t}
          />
        </View>

        {/* CTA Button */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.button, { backgroundColor: colors.deepGold }, shadows.md]}
            onPress={handleStart}
            disabled={isSkipping}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Get Started
            </Text>
          </Pressable>
          <Pressable
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isSkipping}
          >
            <Text style={[styles.skipText, { color: t.textSecondary }]}>
              Skip onboarding
            </Text>
          </Pressable>
          <Text style={[styles.footerText, { color: t.textSecondary }]}>
            Takes less than 2 minutes
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    flex: 1,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureText: {
    flex: 1,
    paddingTop: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    gap: 12,
    paddingTop: 20,
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
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
