import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../src/store/useOnboarding';

export default function OnboardingIndex() {
  const router = useRouter();
  const { isOnboardingComplete, currentStep } = useOnboarding();

  useEffect(() => {
    if (isOnboardingComplete) {
      router.replace('/(tabs)');
    } else {
      // Redirect to the appropriate step
      router.replace(`/onboarding/${currentStep}`);
    }
  }, [isOnboardingComplete, currentStep]);

  return null;
}
