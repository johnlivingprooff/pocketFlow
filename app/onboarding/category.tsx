import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, Modal, FlatList, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { createCategory } from '../../src/lib/db/categories';
import { EmojiPicker } from '../../src/components/EmojiPicker';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import * as CategoryIcons from '../../src/assets/icons/CategoryIcons';
import { CATEGORY_ICONS, CategoryIconName } from '../../src/assets/icons/CategoryIcons';

const SVG_ICON_NAMES: CategoryIconName[] = [
  'moneysend',
  'moneyrecive',
  'money',
  'food',
  'transport',
  'shopping',
  'home',
  'health',
  'entertainment',
  'education',
  'phone',
  'electricity',
  'water',
  'fuel',
  'gift',
  'transfer',
  'investment',
  'agriculture',
  'gym',
  'groceries',
];

export default function CategoryTutorialScreen() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const { setCurrentStep, completeStep, previousSteps, goBackToPreviousStep } = useOnboarding();
  const router = useRouter();
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

  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [iconType, setIconType] = useState<'svg' | 'emoji'>('svg');
  const [selectedSvg, setSelectedSvg] = useState<CategoryIconName>('moneysend');
  const [selectedEmoji, setSelectedEmoji] = useState('🛒');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSvgPicker, setShowSvgPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isEmojiIcon = (iconValue: string): boolean => {
    if (!iconValue) return false;
    return /[\p{Emoji}]/u.test(iconValue);
  };

  const renderCategoryIcon = (
    iconValue: string | undefined,
    size: number = 24,
    color: string = '#FFFFFF'
  ) => {
    const icon = iconValue || '';
    if (isEmojiIcon(icon)) {
      return <Text style={{ fontSize: size }}>{icon}</Text>;
    }

    const fallbackKey: CategoryIconName = 'moneysend';
    const iconKey = (icon || fallbackKey) as CategoryIconName;
    const IconComp = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS[fallbackKey];
    return IconComp ? <IconComp size={size} color={color} /> : null;
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your category.');
      return;
    }

    setIsCreating(true);
    try {
      const iconToSave = iconType === 'emoji' ? selectedEmoji : selectedSvg;
      
      await createCategory({
        name: categoryName.trim(),
        type: categoryType,
        icon: iconToSave,
      });

      completeStep('category');
      setCurrentStep('budget');
      router.push('/onboarding/budget');
    } catch (error) {
      console.error('Failed to create category:', error);
      Alert.alert('Error', 'Could not create category. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    completeStep('category');
    setCurrentStep('budget');
    router.push('/onboarding/budget');
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
            <View style={[styles.progressFill, { width: '37.5%', backgroundColor: colors.deepGold }]} />
          </View>
          <Text style={[styles.progressText, { color: t.textSecondary }]}>
            Step 3 of 8
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🏷️</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Create a Custom Category
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Categories help you organize and track your spending. We have many built-in, but you can add your own!
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Category Type
            </Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: categoryType === 'expense' ? colors.negativeRed + '20' : colors.mutedGrey + '10',
                    borderColor: categoryType === 'expense' ? colors.negativeRed : colors.mutedGrey + '30',
                  },
                ]}
                onPress={() => setCategoryType('expense')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color: categoryType === 'expense' ? colors.negativeRed : t.textPrimary,
                      fontWeight: categoryType === 'expense' ? '700' : '500',
                    },
                  ]}
                >
                  💸 Expense
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: categoryType === 'income' ? colors.positiveGreen + '20' : colors.mutedGrey + '10',
                    borderColor: categoryType === 'income' ? colors.positiveGreen : colors.mutedGrey + '30',
                  },
                ]}
                onPress={() => setCategoryType('income')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color: categoryType === 'income' ? colors.positiveGreen : t.textPrimary,
                      fontWeight: categoryType === 'income' ? '700' : '500',
                    },
                  ]}
                >
                  💰 Income
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Icon Type
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setIconType('svg')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: iconType === 'svg' ? t.primary : t.card,
                  borderWidth: 1,
                  borderColor: iconType === 'svg' ? t.primary : t.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: iconType === 'svg' ? '#FFFFFF' : t.textPrimary, fontWeight: '600' }}>
                  SVG Icons
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIconType('emoji')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: iconType === 'emoji' ? t.primary : t.card,
                  borderWidth: 1,
                  borderColor: iconType === 'emoji' ? t.primary : t.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: iconType === 'emoji' ? '#FFFFFF' : t.textPrimary, fontWeight: '600' }}>
                  Emoji
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Category Icon
            </Text>
            <Pressable
              style={[
                styles.iconButton,
                { backgroundColor: t.card, borderColor: t.border },
              ]}
              onPress={() => iconType === 'emoji' ? setShowEmojiPicker(true) : setShowSvgPicker(true)}
            >
              <View style={styles.selectedIconDisplay}>
                {iconType === 'emoji' ? (
                  <Text style={{ fontSize: 40 }}>{selectedEmoji}</Text>
                ) : (
                  renderCategoryIcon(selectedSvg, 40, t.textPrimary)
                )}
              </View>
              <Text style={[styles.iconButtonText, { color: t.textSecondary }]}>
                Tap to change
              </Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Category Name <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: t.card,
                  color: t.textPrimary,
                  borderColor: t.border,
                },
              ]}
              placeholder="e.g., Coffee, Subscriptions, Side Hustle"
              placeholderTextColor={t.textSecondary}
              value={categoryName}
              onChangeText={setCategoryName}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.deepGold + '10' }]}>
          <Text style={[styles.infoText, { color: t.textPrimary }]}>
            💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> You can always add more categories later from the Categories screen!
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: colors.deepGold, opacity: isCreating ? 0.6 : 1 },
              shadows.md,
            ]}
            onPress={handleCreateCategory}
            disabled={isCreating}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isCreating ? 'Creating...' : 'Create Category'}
            </Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: t.textSecondary }]}>
              Skip this step
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          selectedEmoji={selectedEmoji}
          onEmojiSelected={(selected) => {
            setSelectedEmoji(selected);
            setShowEmojiPicker(false);
          }}
          themeColors={t}
        />
      )}

      {/* SVG Icon Picker Modal */}
      <Modal visible={showSvgPicker} animationType="slide" transparent={true}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: t.background }]} edges={['top']}>
          <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
            <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Select Icon</Text>
            <Pressable onPress={() => setShowSvgPicker(false)} style={styles.modalCloseButton}>
              <Text style={[styles.modalCloseText, { color: t.textPrimary }]}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={SVG_ICON_NAMES}
            numColumns={4}
            contentContainerStyle={styles.iconGridContainer}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.iconGridItem,
                  {
                    backgroundColor: selectedSvg === item ? t.primary : t.card,
                    borderColor: selectedSvg === item ? t.primary : t.border,
                  },
                ]}
                onPress={() => setSelectedSvg(item)}
              >
                {renderCategoryIcon(item, 32, selectedSvg === item ? '#FFFFFF' : t.textPrimary)}
              </Pressable>
            )}
            keyExtractor={(item) => item}
          />
        </SafeAreaView>
      </Modal>
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
    marginBottom: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 15,
  },
  iconButton: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  selectedIconDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  iconButtonText: {
    fontSize: 13,
  },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  infoBox: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
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
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconGridContainer: {
    padding: 12,
    gap: 12,
  },
  iconGridItem: {
    flex: 0.22,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
});
