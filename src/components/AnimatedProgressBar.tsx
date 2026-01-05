import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  backgroundColor?: string;
  fillColor: string;
  height?: number;
  borderRadius?: number;
  duration?: number;
}

/**
 * Animated progress bar that smoothly animates width changes
 * @param progress - Progress percentage (0-100)
 * @param fillColor - Color of the filled portion
 * @param backgroundColor - Background color (default: #E5E7EB)
 * @param height - Height in pixels (default: 4)
 * @param borderRadius - Border radius (default: 2)
 * @param duration - Animation duration in ms (default: 300)
 */
export function AnimatedProgressBar({
  progress,
  backgroundColor = '#E5E7EB',
  fillColor,
  height = 4,
  borderRadius = 2,
  duration = 300,
}: AnimatedProgressBarProps) {
  const animatedProgress = useSharedValue(progress);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  return (
    <View style={[styles.container, { backgroundColor, height, borderRadius, overflow: 'hidden' }]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: fillColor, borderRadius },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
