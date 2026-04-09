import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../src/store/useOnboarding';

export default function OnboardingIndex() {
  const router = useRouter();
  const { currentStep } = useOnboarding();

  useEffect(() => {
    router.replace(`/onboarding/${currentStep}` as never);
  }, [currentStep, router]);

  return null;
}
