import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { ChartIcon, WalletIcon } from '../../src/assets/icons/CategoryIcons';

export default function AnalyticsTutorialScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const { completeOnboarding } = useOnboarding();
  const router = useRouter();
  const t = theme(themeMode, systemColorScheme || 'light');

  const handleFinish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%', backgroundColor: colors.positiveGreen }]} />
          </View>
          <Text style={[styles.progressText, { color: t.textSecondary }]}>
            Step 9 of 9 - Complete! 🎉
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <ChartIcon size={48} color={colors.deepGold} />
          <Text style={[styles.title, { color: t.textPrimary }]}>
            You're All Set!
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Here's what you've accomplished:
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
            icon={<Text style={{ fontSize: 24 }}>💸</Text>}
            title="Transaction Added"
            description="Start tracking your finances"
            t={t}
          />
        </View>

        {/* Analytics Info */}
        <View style={[styles.card, { backgroundColor: colors.deepGold + '10' }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary }]}>
            📊 About Analytics
          </Text>
          <Text style={[styles.cardText, { color: t.textSecondary }]}>
            The Analytics tab shows you:
          </Text>
          <View style={styles.features}>
            <Text style={[styles.featureText, { color: t.textSecondary }]}>
              • Income vs Expense trends over time
            </Text>
            <Text style={[styles.featureText, { color: t.textSecondary }]}>
              • Spending breakdown by category
            </Text>
            <Text style={[styles.featureText, { color: t.textSecondary }]}>
              • Budget and goal progress
            </Text>
            <Text style={[styles.featureText, { color: t.textSecondary }]}>
              • Financial health insights
            </Text>
          </View>
        </View>

        {/* Final Message */}
        <View style={[styles.finalBox, { backgroundColor: colors.positiveGreen + '10' }]}>
          <Text style={[styles.finalText, { color: t.textPrimary }]}>
            🎉 <Text style={{ fontWeight: '700' }}>Congratulations!</Text> You're ready to take control of your finances with pocketFlow!
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, { backgroundColor: t.primary }]}
            onPress={handleFinish}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
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
        <Text style={[styles.achievementTitle, { color: t.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.achievementDescription, { color: t.textSecondary }]}>
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
    minHeight: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
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
