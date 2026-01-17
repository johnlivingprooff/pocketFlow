// PocketFlow Design System v3.1 - Teal Day / Gold Night
export const colors = {
  // Light Mode Brand (Deep Teal)
  teal900: '#041C1F',
  teal700: '#00695C',    // Primary Light
  teal600: '#0D9488',
  teal500: '#14B8A6',
  teal100: '#CCFBF1',
  teal50: '#F0FDFA',

  // Dark Mode Brand (Luxury Gold)
  goldPrimary: '#D4AF37', // Metallic Gold
  goldLight: '#F4CF60',   // Bright Gold
  goldDark: '#AA8C2C',    // Deep Gold
  black: '#000000',
  charcoal: '#121212',    // Card Surface
  grey900: '#1A1A1A',     // Slightly lighter background option

  // Neutrals
  white: '#FFFFFF',
  grey100: '#F5F5F5',
  grey200: '#E5E5E5',
  grey800: '#262626',

  // Status
  success: '#10B981',    // Emerald
  danger: '#EF4444',     // Red
  warning: '#F59E0B',    // Amber

  // Semantic aliases
  deepGold: '#C1A12F',       // Deep Gold for accents
  positiveGreen: '#10B981',  // Same as success
  negativeRed: '#EF4444',    // Same as danger
  mutedGrey: '#A3A3A3',      // Neutral grey
  neutralBeige: '#E5E5E5',   // Light neutral
};

export type ThemeMode = 'light' | 'dark' | 'dark-teal' | 'system';

export const theme = (mode: ThemeMode, systemColorScheme?: string) => {
  const effectiveMode = mode === 'system' ? (systemColorScheme || 'light') : mode;
  const isDarkTeal = effectiveMode === 'dark-teal';
  const isDark = effectiveMode === 'dark';
  const isLight = effectiveMode === 'light';

  // Defines specifics for the Deep Teal Dark theme
  const darkTealBackground = '#021214'; // Almost black teal
  const darkTealCard = colors.teal900; // #041C1F

  return {
    mode: effectiveMode,
    // Layout
    background: isLight ? colors.white : (isDarkTeal ? darkTealBackground : colors.black),
    card: isLight ? colors.grey100 : (isDarkTeal ? darkTealCard : colors.charcoal),
    border: isLight ? colors.grey200 : (isDarkTeal ? '#0D3538' : '#333333'),

    // Typography
    textPrimary: isLight ? colors.teal900 : (isDarkTeal ? colors.teal50 : colors.goldLight),
    textSecondary: isLight ? '#525252' : (isDarkTeal ? '#94B8B8' : '#A3A3A3'),
    textTertiary: isLight ? '#A3A3A3' : (isDarkTeal ? '#5C8A8A' : '#666666'),

    // Brand
    primary: isLight ? colors.teal700 : (isDarkTeal ? colors.teal500 : colors.goldPrimary),
    primaryLight: isLight ? colors.teal500 : (isDarkTeal ? colors.teal100 : colors.goldLight),
    primaryDark: isLight ? colors.teal900 : (isDarkTeal ? '#003833' : colors.goldDark),
    accent: isLight ? colors.teal600 : (isDarkTeal ? colors.teal500 : colors.goldPrimary),

    // Status (Consistent across modes, just readable)
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
    shadowColor: '#C1A12F', // Gold Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#C1A12F', // Gold Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#C1A12F', // Gold Shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const fonts = {
  primaryStack: ['Inter', 'System', 'Helvetica Neue', 'Roboto', 'Segoe UI'],
};
