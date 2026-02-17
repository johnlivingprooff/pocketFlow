import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useOnboarding } from '../../src/store/useOnboarding';

export default function LegacyTransactionOnboardingRedirect() {
  const router = useRouter();
  const { setCurrentStep } = useOnboarding();

  useEffect(() => {
    setCurrentStep('analytics');
    router.replace('/onboarding/analytics');
  }, [router, setCurrentStep]);

  return null;
}
