import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  | 'analytics'
  | 'complete';

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

// Form data types for each step
export interface OnboardingFormData {
  welcome?: Record<string, any>;
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    currency?: string;
  };
  reminders?: {
    enabled?: boolean;
    preferredTimeLocal?: string;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
  };
  wallet?: {
    name?: string;
    type?: string;
    balance?: string;
  };
  category?: {
    name?: string;
    emoji?: string;
  };
  budget?: {
    name?: string;
    limitAmount?: string;
    periodType?: string;
    selectedCategory?: string;
  };
  goal?: {
    name?: string;
    targetAmount?: string;
    targetMonths?: string;
  };
  transaction?: {
    amount?: string;
    description?: string;
    type?: 'expense' | 'income';
    selectedCategory?: string;
  };
  transfer?: Record<string, any>;
  analytics?: Record<string, any>;
  complete?: Record<string, any>;
}

interface OnboardingState {
  isOnboardingComplete: boolean;
  isSkipped: boolean; // Track if user skipped onboarding
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  previousSteps: OnboardingStep[]; // History for back navigation
  formData: OnboardingFormData;
  // Tutorial state
  createdWalletId: number | null;
  createdCategoryId: number | null;
  createdBudgetId: number | null;
  createdGoalId: number | null;
  createdTransactionId: number | null;
  // Actions
  setCurrentStep: (step: OnboardingStep) => void;
  goBackToPreviousStep: () => void;
  completeStep: (step: OnboardingStep) => void;
  setCreatedWalletId: (id: number) => void;
  setCreatedCategoryId: (id: number) => void;
  setCreatedBudgetId: (id: number) => void;
  setCreatedGoalId: (id: number) => void;
  setCreatedTransactionId: (id: number) => void;
  saveFormData: (step: OnboardingStep, data: any) => void;
  clearFormData: (step?: OnboardingStep) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

const initialState = {
  isOnboardingComplete: false,
  isSkipped: false,
  currentStep: 'welcome' as OnboardingStep,
  completedSteps: [] as OnboardingStep[],
  previousSteps: [] as OnboardingStep[],
  formData: {},
  createdWalletId: null,
  createdCategoryId: null,
  createdBudgetId: null,
  createdGoalId: null,
  createdTransactionId: null,
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setCurrentStep: (step) => set((state) => ({
        currentStep: step,
        previousSteps: [...state.previousSteps, state.currentStep],
      })),
      goBackToPreviousStep: () => set((state) => {
        if (state.previousSteps.length === 0) return state;
        const newPreviousSteps = [...state.previousSteps];
        const previousStep = newPreviousSteps.pop();
        return {
          currentStep: previousStep || state.currentStep,
          previousSteps: newPreviousSteps,
        };
      }),
      completeStep: (step) => set((state) => ({
        completedSteps: [...new Set([...state.completedSteps, step])],
      })),
      setCreatedWalletId: (id) => set({ createdWalletId: id }),
      setCreatedCategoryId: (id) => set({ createdCategoryId: id }),
      setCreatedBudgetId: (id) => set({ createdBudgetId: id }),
      setCreatedGoalId: (id) => set({ createdGoalId: id }),
      setCreatedTransactionId: (id) => set({ createdTransactionId: id }),
      saveFormData: (step, data) => set((state) => ({
        formData: {
          ...state.formData,
          [step]: { ...state.formData[step as keyof OnboardingFormData], ...data },
        },
      })),
      clearFormData: (step) => set((state) => {
        if (step) {
          const { [step]: _, ...rest } = state.formData;
          return { formData: rest as OnboardingFormData };
        }
        return { formData: {} };
      }),
      completeOnboarding: () => set({ 
        isOnboardingComplete: true,
        currentStep: 'complete',
        formData: {}, // Clear form data after completion
      }),
      skipOnboarding: () => set({
        isSkipped: true,
        isOnboardingComplete: true,
        currentStep: 'complete',
        formData: {}, // Clear form data after skip
      }),
      resetOnboarding: () => set(initialState),
    }),
    {
      name: 'pocketflow-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
