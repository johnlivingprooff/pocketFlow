import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingStep = 'welcome' | 'profile' | 'wallet';

export const ONBOARDING_STEPS: OnboardingStep[] = ['welcome', 'profile', 'wallet'];

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  hasCompletedOnboarding: boolean;
  completeStep: (step: OnboardingStep) => void;
  skipStep: (step: OnboardingStep) => void;
  setCurrentStep: (step: OnboardingStep) => void;
  resetOnboarding: () => void;
}

const getNextStep = (step: OnboardingStep): OnboardingStep | null => {
  const currentIndex = ONBOARDING_STEPS.indexOf(step);
  if (currentIndex === -1) return null;
  return ONBOARDING_STEPS[currentIndex + 1] || null;
};

const initialState = {
  currentStep: 'welcome' as OnboardingStep,
  completedSteps: [] as OnboardingStep[],
  skippedSteps: [] as OnboardingStep[],
  hasCompletedOnboarding: false,
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      completeStep: (step) => {
        const nextStep = getNextStep(step);
        const completed = Array.from(new Set([...get().completedSteps, step]));

        if (!nextStep) {
          set({
            completedSteps: completed,
            currentStep: 'wallet',
            hasCompletedOnboarding: true,
          });
          return;
        }

        set({
          completedSteps: completed,
          currentStep: nextStep,
        });
      },
      skipStep: (step) => {
        const nextStep = getNextStep(step);
        const skipped = Array.from(new Set([...get().skippedSteps, step]));

        if (!nextStep) {
          set({
            skippedSteps: skipped,
            currentStep: 'wallet',
            hasCompletedOnboarding: true,
          });
          return;
        }

        set({
          skippedSteps: skipped,
          currentStep: nextStep,
        });
      },
      setCurrentStep: (step) => set({ currentStep: step }),
      resetOnboarding: () => set(initialState),
    }),
    {
      name: 'pocketflow-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
