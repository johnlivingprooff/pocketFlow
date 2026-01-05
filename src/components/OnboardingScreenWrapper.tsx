import React, { useEffect } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import Animated, { 
  FadeIn, 
  SlideInRight, 
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface OnboardingScreenWrapperProps {
  children: React.ReactNode;
  backgroundColor: string;
  edges?: ('left' | 'right' | 'top' | 'bottom')[];
}

/**
 * Wrapper component for onboarding screens that provides smooth enter/exit animations
 */
export function OnboardingScreenWrapper({
  children,
  backgroundColor,
  edges = ['left', 'right', 'top'],
}: OnboardingScreenWrapperProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, { backgroundColor }]}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={edges}>
        {children}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
