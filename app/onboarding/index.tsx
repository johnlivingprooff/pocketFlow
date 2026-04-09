import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../src/store/useOnboarding';

export default function OnboardingIndex() {
  const router = useRouter();
  const { currentStep, hasCompletedOnboarding } = useOnboarding();

  useEffect(() => {
    if (hasCompletedOnboarding) {
      router.replace('/(tabs)' as never);
      return;
    }

    router.replace(`/onboarding/${currentStep}` as never);
  }, [currentStep, hasCompletedOnboarding, router]);

  return null;
}
