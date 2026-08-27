import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { ChartIcon, WalletIcon } from '../../src/assets/icons/CategoryIcons';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';

export default function AnalyticsTutorialScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const { completeOnboarding, setCurrentStep } = useOnboarding();
  const router = useRouter();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [showTransferTips, setShowTransferTips] = useState(false);

  const handleFinish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    setCurrentStep('goal');
    router.push('/onboarding/goal');
  };

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: t.background }]) as any} edges={['left', 'right', 'top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingHeader canGoBack={true} onBack={handleBack} currentStep="analytics" />

        {/* Header */}
        <View style={styles.header}>
          <ChartIcon size={48} color={colors.deepGold} />
          <Text style={StyleSheet.flatten([styles.title, { color: t.textPrimary }]) as any}>
            You're All Set!
          </Text>
          <Text style={StyleSheet.flatten([styles.subtitle, { color: t.textSecondary }]) as any}> 
            Quick recap before you start using pocketFlow:
          </Text>
        </View>

        {/* Achievements */}
        <View style={styles.achievements}>
          <AchievementItem
            icon={<Text style={{ fontSize: 24 }}>✅</Text>}
            title="Profile Created"
            description="Your account is ready"
            t={t}
          />
          <AchievementItem
            icon={<Text style={{ fontSize: 24 }}>🔔</Text>}
            title="Reminders Configured"
            description="Daily cadence set your way"
            t={t}
          />
          <AchievementItem
            icon={<WalletIcon size={24} color={colors.deepGold} />}
            title="First Wallet Added"
            description="Track your money"
            t={t}
          />
          <AchievementItem
            icon={<Text style={{ fontSize: 24 }}>🏷️</Text>}
            title="Category Customized"
            description="Organize your transactions"
            t={t}
          />
          <AchievementItem
            icon={<Text style={{ fontSize: 24 }}>📊</Text>}
            title="Budget Created"
            description="Control your spending"
            t={t}
          />
          <AchievementItem
            icon={<Text style={{ fontSize: 24 }}>🎯</Text>}
            title="Goal Set"
            description="Track your savings"
            t={t}
          />
          <AchievementItem
            icon={<Text style={{ fontSize: 24 }}>🔄</Text>}
            title="Transfer Tips Ready"
            description="Optional transfer guide below when you need it"
            t={t}
          />
        </View>

        {/* Analytics Info */}
        <View style={StyleSheet.flatten([styles.card, { backgroundColor: colors.deepGold + '10' }]) as any}> 
          <Text style={StyleSheet.flatten([styles.cardTitle, { color: t.textPrimary }]) as any}>
            📊 About Analytics
          </Text>
          <Text style={StyleSheet.flatten([styles.cardText, { color: t.textSecondary }]) as any}>
            The Analytics tab shows you:
          </Text>
          <View style={styles.features}>
            <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>
              • Income vs Expense trends over time
            </Text>
            <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>
              • Spending breakdown by category
            </Text>
            <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>
              • Budget and goal progress
            </Text>
            <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>
              • Financial health insights
            </Text>
          </View>
        </View>

        {/* Optional transfer guide */}
        <View style={StyleSheet.flatten([styles.card, { backgroundColor: t.card, borderWidth: 1, borderColor: t.border }]) as any}> 
          <Pressable style={styles.transferHeaderRow} onPress={() => setShowTransferTips((prev) => !prev)}>
            <Text style={StyleSheet.flatten([styles.cardTitle, { color: t.textPrimary }]) as any}>🔄 Optional: Transfer Guide</Text>
            <Text style={StyleSheet.flatten([styles.transferToggle, { color: t.primary }]) as any}>{showTransferTips ? 'Hide' : 'Show'}</Text>
          </Pressable>
          {showTransferTips && (
            <View style={styles.features}>
              <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>• Open Wallets tab</Text>
              <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>• Tap Transfer</Text>
              <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>• Choose source and destination wallets</Text>
              <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>• Enter amount and confirm</Text>
              <Text style={StyleSheet.flatten([styles.featureText, { color: t.textSecondary }]) as any}>• Transfers move money only; they do not count as income or expense</Text>
            </View>
          )}
        </View>

        {/* Final Message */}
        <View style={StyleSheet.flatten([styles.finalBox, { backgroundColor: colors.positiveGreen + '10' }]) as any}> 
          <Text style={StyleSheet.flatten([styles.finalText, { color: t.textPrimary }]) as any}> 
            🎉 <Text style={{ fontWeight: '700' }}>Congratulations!</Text> You are set up and ready to track your first transaction from the + button anytime.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={StyleSheet.flatten([styles.button, { backgroundColor: t.primary }]) as any}
            onPress={handleFinish}
          >
            <Text style={StyleSheet.flatten([styles.buttonText, { color: '#FFFFFF' }]) as any}>
              Start Using pocketFlow
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface AchievementItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  t: ReturnType<typeof theme>;
}

function AchievementItem({ icon, title, description, t }: AchievementItemProps) {
  return (
    <View style={styles.achievement}>
      <View style={styles.achievementIcon}>
        {icon}
      </View>
      <View style={styles.achievementText}>
        <Text style={StyleSheet.flatten([styles.achievementTitle, { color: t.textPrimary }]) as any}>
          {title}
        </Text>
        <Text style={StyleSheet.flatten([styles.achievementDescription, { color: t.textSecondary }]) as any}>
          {description}
        </Text>
      </View>
    </View>
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

  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  achievements: {
    gap: 16,
    marginBottom: 24,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
  },
  achievementIcon: {
    fontSize: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 13,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  transferHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  transferToggle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  features: {
    gap: 8,
    marginTop: 4,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 22,
  },
  finalBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  finalText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
