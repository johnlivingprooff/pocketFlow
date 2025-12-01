// PocketFlow Design System v1.0 - Color Guide
export const colors = {
  // Primary Brand
  primary900: '#0A2540',
  primary600: '#1A73E8',
  primary300: '#A6C8FF',
  
  // Secondary Brand
  secondary600: '#00C4B3',
  secondary200: '#D3FFF7',
  
  // Success
  success600: '#2ECC71',
  success200: '#CFF6DC',
  
  // Danger
  danger600: '#E63946',
  danger200: '#F9D2D5',
  
  // Warning
  warning600: '#F4A100',
  warning200: '#FFEAC2',
  
  // Backgrounds
  bg100: '#FFFFFF',
  bg200: '#F5F7FA',
  
  // Dark Mode Backgrounds
  bgDark900: '#0A0E14',
  bgDark800: '#151A23',
  
  // Borders
  border300: '#D0D7E2',
  border400: '#B4BBC6',
  
  // Text
  text900: '#2A2A2A',
  text600: '#4A4A4A',
  text300: '#A0A0A0',
  
  // Dark Mode Text
  textDark100: '#F5F7FA',
  textDark400: '#B4BBC6',
  textDark600: '#7A8299',
};

export type ThemeMode = 'light' | 'dark' | 'system';

export const theme = (mode: ThemeMode, systemColorScheme?: 'light' | 'dark') => {
  const effectiveMode = mode === 'system' ? (systemColorScheme || 'light') : mode;
  
  return {
    mode: effectiveMode,
    // Backgrounds
    background: effectiveMode === 'light' ? colors.bg200 : colors.bgDark900,
    card: effectiveMode === 'light' ? colors.bg100 : colors.bgDark800,
    
    // Text
    textPrimary: effectiveMode === 'light' ? colors.text900 : colors.textDark100,
    textSecondary: effectiveMode === 'light' ? colors.text600 : colors.textDark400,
    textTertiary: effectiveMode === 'light' ? colors.text300 : colors.textDark600,
    
    // Brand
    primary: colors.primary600,
    primaryDark: colors.primary900,
    primaryLight: colors.primary300,
    
    secondary: colors.secondary600,
    secondaryLight: colors.secondary200,
    
    // Semantic
    success: colors.success600,
    successLight: colors.success200,
    danger: colors.danger600,
    dangerLight: colors.danger200,
    warning: colors.warning600,
    warningLight: colors.warning200,
    
    // UI Elements
    border: effectiveMode === 'light' ? colors.border300 : colors.border400,
    borderStrong: colors.border400,
    
    // Backwards compatibility aliases
    accent: colors.primary600,
    income: colors.success600,
    expense: colors.danger600,
  };
};

export const shadows = {
  xs: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  sm: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  lg: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
};

export const fonts = {
  primaryStack: ['Inter', 'System', 'Helvetica Neue', 'Roboto', 'Segoe UI'],
};
