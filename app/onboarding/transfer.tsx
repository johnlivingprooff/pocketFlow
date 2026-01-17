import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { TransferIcon } from '../../src/assets/icons/CategoryIcons';

export default function TransferTutorialScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const { setCurrentStep, completeStep } = useOnboarding();
  const router = useRouter();
  const t = theme(themeMode, systemColorScheme || 'light');

  const handleContinue = () => {
    completeStep('transfer');
    setCurrentStep('analytics');
    router.push('/onboarding/analytics');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '85.7%', backgroundColor: colors.deepGold }]} />
          </View>
          <Text style={[styles.progressText, { color: t.textSecondary }]}>
            Step 6 of 7
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TransferIcon size={48} color={colors.deepGold} />
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Making Transfers
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Move money between your wallets easily
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.mutedGrey + '10' }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary }]}>
              💡 What are Transfers?
            </Text>
            <Text style={[styles.cardText, { color: t.textSecondary }]}>
              Transfers let you move money between your wallets. For example:
            </Text>
            <View style={styles.examples}>
              <Text style={[styles.exampleText, { color: t.textSecondary }]}>
                • Withdrawing cash from your bank account
              </Text>
              <Text style={[styles.exampleText, { color: t.textSecondary }]}>
                • Moving money from Mobile Money to Cash
              </Text>
              <Text style={[styles.exampleText, { color: t.textSecondary }]}>
                • Transferring between different bank accounts
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.deepGold + '10' }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary }]}>
              📍 How to Make a Transfer
            </Text>
            <View style={styles.steps}>
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: colors.deepGold }]}>
                  <Text style={[styles.stepNumberText, { color: '#FFFFFF' }]}>1</Text>
                </View>
                <Text style={[styles.stepText, { color: t.textSecondary }]}>
                  Go to the Wallets tab
                </Text>
              </View>
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: colors.deepGold }]}>
                  <Text style={[styles.stepNumberText, { color: '#FFFFFF' }]}>2</Text>
                </View>
                <Text style={[styles.stepText, { color: t.textSecondary }]}>
                  Tap the Transfer button (🔄 icon)
                </Text>
              </View>
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: colors.deepGold }]}>
                  <Text style={[styles.stepNumberText, { color: '#FFFFFF' }]}>3</Text>
                </View>
                <Text style={[styles.stepText, { color: t.textSecondary }]}>
                  Select source and destination wallets
                </Text>
              </View>
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: colors.deepGold }]}>
                  <Text style={[styles.stepNumberText, { color: '#FFFFFF' }]}>4</Text>
                </View>
                <Text style={[styles.stepText, { color: t.textSecondary }]}>
                  Enter the amount and confirm
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.positiveGreen + '10' }]}>
            <Text style={[styles.infoText, { color: t.textPrimary }]}>
              ✨ <Text style={{ fontWeight: '600' }}>Pro Tip:</Text> Transfers don't count as income or expenses in your analytics. They're just moving money around!
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, { backgroundColor: t.primary }]}
            onPress={handleContinue}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Got It, Continue
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
    minHeight: 4,
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
  content: {
    gap: 20,
    marginBottom: 32,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    gap: 12,
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
  examples: {
    gap: 8,
    marginTop: 4,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 22,
  },
  steps: {
    gap: 16,
    marginTop: 8,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    paddingTop: 2,
  },
  infoBox: {
    padding: 16,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
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
