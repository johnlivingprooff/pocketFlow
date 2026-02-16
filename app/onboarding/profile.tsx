import * as React from 'react';
import { useState, useEffect } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme, shadows, colors } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { useOnboarding } from '../../src/store/useOnboarding';
import { CURRENCIES } from '../../src/constants/currencies';
import { SelectModal, SelectOption } from '../../src/components/SelectModal';
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
import { useColorScheme } from 'react-native';

export default function ProfileSetupScreen() {
  const { themeMode, setUserInfo, setDefaultCurrency } = useSettings();
  const { setCurrentStep, completeStep, previousSteps, formData, saveFormData, goBackToPreviousStep } = useOnboarding();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  // Initialize from saved form data if returning
  const [name, setName] = useState(formData.profile?.name || '');
  const [email, setEmail] = useState(formData.profile?.email || '');
  const [phone, setPhone] = useState(formData.profile?.phone || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [currency, setCurrency] = useState(formData.profile?.currency || 'MWK');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // Auto-save form data on changes
  useEffect(() => {
    saveFormData('profile', {
      name,
      email,
      phone,
      currency,
    });
  }, [name, email, phone, currency, saveFormData]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const stepRoutes: Record<string, string> = {
    welcome: '/onboarding/welcome',
    profile: '/onboarding/profile',
    reminders: '/onboarding/reminders',
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

  const handleContinue = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }

    // Save user info
    setUserInfo({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      profileImage,
    });
    setDefaultCurrency(currency);

    completeStep('profile');
    setCurrentStep('reminders');
    router.push('/onboarding/reminders');
  };

  const handleSkip = () => {
    setUserInfo({ name: 'pFlowr' });
    setDefaultCurrency(currency);
    completeStep('profile');
    setCurrentStep('reminders');
    router.push('/onboarding/reminders');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingHeader 
          canGoBack={previousSteps.length > 0}
          onBack={handleBack}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            Set Up Your Profile
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Let's personalize your experience
          </Text>
        </View>

        {/* Profile Image */}
        <View style={styles.imageSection}>
          <Pressable 
            style={[styles.imagePicker, { backgroundColor: colors.mutedGrey + '20' }]}
            onPress={handlePickImage}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={t.textSecondary} strokeWidth="2">
                  <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <Circle cx="12" cy="7" r="4" />
                </Svg>
                <Text style={[styles.imagePlaceholderText, { color: t.textSecondary }]}>
                  Add Photo
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Name <Text style={{ color: colors.negativeRed }}>*</Text>
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
              placeholder="Enter your name"
              placeholderTextColor={t.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Email
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
              placeholder="your@email.com"
              placeholderTextColor={t.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Phone
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
              placeholder="+265 xxx xxx xxx"
              placeholderTextColor={t.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.textPrimary }]}>
              Default Currency <Text style={{ color: colors.negativeRed }}>*</Text>
            </Text>
            <Pressable
              style={[
                styles.input,
                {
                  backgroundColor: colors.mutedGrey + '10',
                  borderColor: colors.mutedGrey + '30',
                  justifyContent: 'center',
                },
              ]}
              onPress={() => setShowCurrencyModal(true)}
            >
              <Text style={[styles.currencyText, { color: t.textPrimary }]}>
                {currency}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, { backgroundColor: t.primary }]}
            onPress={handleContinue}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Continue
            </Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: t.textSecondary }]}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Currency Modal */}
      <SelectModal
        visible={showCurrencyModal}
        title="Select Currency"
        options={CURRENCIES.map(c => ({ id: c, label: c }))}
        selectedId={currency}
        onSelect={(option: SelectOption) => {
          setCurrency(option.id as string);
          setShowCurrencyModal(false);
        }}
        onClose={() => setShowCurrencyModal(false)}
      />
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
  },
  form: {
    gap: 20,
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
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
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
});
