import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

// iOS Dynamic Type scale factors
const dynamicTypeScales: Record<string, number> = {
  'xSmall': 0.82,
  'Small': 0.88,
  'Medium': 0.94,
  'Large': 1.0,      // Default
  'xLarge': 1.06,
  'xxLarge': 1.18,
  'xxxLarge': 1.3,
  'Accessibility1': 1.42,
  'Accessibility2': 1.58,
  'Accessibility3': 1.74,
  'Accessibility4': 1.9,
  'Accessibility5': 2.0,
};

/**
 * Hook to get the current dynamic type scale factor
 * Uses fontScale from useWindowDimensions for cross-platform support
 */
export function useDynamicTypeScale(): number {
  const { fontScale } = useWindowDimensions();
  
  // On iOS, respect the system font scale
  // On Android, also respect but cap at 1.5 for layout stability
  if (Platform.OS === 'ios') {
    return fontScale;
  }
  
  // On Android, limit maximum scale to prevent layout issues
  return Math.min(fontScale, 1.5);
}

/**
 * Scale a font size based on user's accessibility preferences
 */
export function useScaledFontSize(baseSize: number): number {
  const scale = useDynamicTypeScale();
  return Math.round(baseSize * scale);
}

/**
 * Font size definitions that can be scaled
 */
export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

/**
 * Get scaled font sizes object
 * Use this in components for accessibility support
 */
export function useScaledFontSizes() {
  const scale = useDynamicTypeScale();
  
  return {
    xs: Math.round(fontSizes.xs * scale),
    sm: Math.round(fontSizes.sm * scale),
    base: Math.round(fontSizes.base * scale),
    lg: Math.round(fontSizes.lg * scale),
    xl: Math.round(fontSizes.xl * scale),
    '2xl': Math.round(fontSizes['2xl'] * scale),
    '3xl': Math.round(fontSizes['3xl'] * scale),
    '4xl': Math.round(fontSizes['4xl'] * scale),
  };
}
