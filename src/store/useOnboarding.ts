import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The primary flow is welcome -> profile -> wallet -> app.
 * The optional tutorial screens (reminders, category, budget, goal,
 * transaction, transfer, analytics) are reachable through onboarding/index
 * and dev tools. `wallet` and `analytics` are terminal steps: completing
 * either one finishes setup. Keeping the graph explicit prevents an unknown
 * step string from accidentally marking onboarding complete.
 */
export type OnboardingStep =
  | 'welcome'
  | 'profile'
  | 'reminders'
  | 'wallet'
  | 'category'
  | 'budget'
  | 'goal'
  | 'transaction'
  | 'transfer'
  | 'analytics';

const NEXT_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  welcome: 'profile',
  profile: 'wallet',
  reminders: 'wallet',
  category: 'budget',
  budget: 'goal',
  goal: 'analytics',
  transaction: 'transfer',
  transfer: 'analytics',
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'profile',
  'reminders',
  'wallet',
  'category',
  'budget',
  'goal',
  'transaction',
  'transfer',
  'analytics',
];

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  hasCompletedOnboarding: boolean;
  isOnboardingComplete: boolean;
  createdWalletId: number | null;
  completeStep: (step: OnboardingStep) => void;
  skipStep: (step: OnboardingStep) => void;
  setCurrentStep: (step: OnboardingStep) => void;
  setCreatedWalletId: (id: number | null) => void;
  markOnboardingComplete: () => void;
  resetOnboarding: () => void;
}

const getNextStep = (step: OnboardingStep): OnboardingStep | null =>
  NEXT_STEP[step] ?? null;

const initialState = {
  currentStep: 'welcome' as OnboardingStep,
  completedSteps: [] as OnboardingStep[],
  skippedSteps: [] as OnboardingStep[],
  hasCompletedOnboarding: false,
  isOnboardingComplete: false,
  createdWalletId: null as number | null,
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
            currentStep: step,
            hasCompletedOnboarding: true,
            isOnboardingComplete: true,
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
            currentStep: step,
            hasCompletedOnboarding: true,
            isOnboardingComplete: true,
          });
          return;
        }

        set({
          skippedSteps: skipped,
          currentStep: nextStep,
        });
      },
      setCurrentStep: (step) => set({ currentStep: step }),
      setCreatedWalletId: (createdWalletId) => set({ createdWalletId }),
      markOnboardingComplete: () =>
        set({
          currentStep: 'wallet',
          completedSteps: [...ONBOARDING_STEPS],
          skippedSteps: [],
          hasCompletedOnboarding: true,
          isOnboardingComplete: true,
        }),
      resetOnboarding: () => set(initialState),
    }),
    {
      name: 'pocketflow-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
