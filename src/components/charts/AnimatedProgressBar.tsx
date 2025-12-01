import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number; // 0 to 100
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
  textColor: string;
  height?: number;
}

export default function AnimatedProgressBar({
  progress,
  label,
  value,
  color,
  backgroundColor,
  textColor,
  height = 8,
}: AnimatedProgressBarProps) {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    // Animate to the target progress
    animatedWidth.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`,
    };
  });

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }}>
          {label}
        </Text>
        <Text style={{ color: textColor, fontSize: 14, fontWeight: '700' }}>
          {value}
        </Text>
      </View>
      <View
        style={{
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: color,
              borderRadius: height / 2,
            },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}
