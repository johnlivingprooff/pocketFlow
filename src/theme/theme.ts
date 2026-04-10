// PocketFlow Design System v4 - calm day, focused night
export const colors = {
  // Brand core
  teal900: '#0F2A2D',
  teal700: '#0F766E',
  teal600: '#0D9488',
  teal500: '#14B8A6',
  teal100: '#CCFBF1',
  teal50: '#F0FDFA',

  // Dark neutrals
  slate950: '#08181A',
  slate900: '#102224',
  slate800: '#183033',
  slate700: '#285055',

  // Light neutrals
  white: '#FFFFFF',
  grey50: '#FAFAFA',
  grey100: '#F5F7F7',
  grey200: '#E4E7E7',
  grey800: '#2D3A3C',

  // Status
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',

  // Semantic aliases
  positiveGreen: '#10B981',
  negativeRed: '#EF4444',
  mutedGrey: '#8A9799',
};

export type ThemeMode = 'light' | 'dark' | 'system';

export const theme = (mode: ThemeMode, systemColorScheme?: string) => {
  const effectiveMode = mode === 'system' ? (systemColorScheme || 'light') : mode;
  const isDark = effectiveMode === 'dark';

  return {
    mode: effectiveMode,

    // Layout
    background: isDark ? colors.slate950 : colors.white,
    card: isDark ? colors.slate900 : colors.grey100,
    border: isDark ? '#1F3A3E' : colors.grey200,

    // Typography
    textPrimary: isDark ? '#F3FAFA' : colors.teal900,
    textSecondary: isDark ? '#A8BCBE' : '#556466',
    textTertiary: isDark ? '#6F8A8D' : '#94A3A5',

    // Brand
    primary: isDark ? colors.teal500 : colors.teal700,
    primaryLight: isDark ? colors.teal100 : colors.teal500,
    primaryDark: isDark ? '#0B5E58' : colors.teal900,
    accent: isDark ? colors.teal500 : colors.teal600,

    // Status
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,

    // Semantic
    income: colors.success,
    expense: colors.danger,
  };
};

export const shadows = {
  sm: {
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const fonts = {
  primaryStack: ['Inter', 'System', 'Helvetica Neue', 'Roboto', 'Segoe UI'],
};

// Re-export font scaling utilities
export { useDynamicTypeScale, useScaledFontSize, useScaledFontSizes, fontSizes } from './fontScale';
