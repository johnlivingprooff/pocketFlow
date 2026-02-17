import React from 'react';
import { Text, TextProps, useColorScheme } from 'react-native';
import { theme, useScaledFontSizes, ThemeMode } from '../theme/theme';
import { useSettings } from '../store/useStore';

type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

interface ThemedTextProps extends TextProps {
  size?: FontSize;
  weight?: '400' | '500' | '600' | '700' | '800';
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent';
  themeMode?: ThemeMode;
}

/**
 * Text component with automatic iOS Dynamic Type support
 * Respects user's accessibility font size preferences
 */
export function ThemedText({
  children,
  size = 'base',
  weight = '400',
  color = 'primary',
  themeMode: propThemeMode,
  style,
  ...props
}: ThemedTextProps) {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = propThemeMode || themeMode;
  const colors = theme(effectiveMode, systemColorScheme || 'light');
  const scaledSizes = useScaledFontSizes();

  const colorMap = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.accent,
  };

  return (
    <Text
      style={[
        {
          fontSize: scaledSizes[size],
          fontWeight: weight,
          color: colorMap[color],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
