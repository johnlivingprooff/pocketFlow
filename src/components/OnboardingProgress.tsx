import React from 'react';
import { View } from 'react-native';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const active = index < currentStep;
        return (
          <View
            key={index}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 999,
              backgroundColor: active ? '#C9A227' : 'rgba(160,160,160,0.24)',
            }}
          />
        );
      })}
    </View>
  );
}
