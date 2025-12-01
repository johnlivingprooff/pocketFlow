// PocketFlow Design System v1.0 - Color Guide
export const colors = {
  mutedGrey: '#6B6658',        // Primary Neutral
  nearBlack: '#010000',        // Primary Dark
  neutralBeige: '#B3B09E',     // Light Neutral
  deepGold: '#84670B',         // Highlight
  earthyBrown: '#332D23',      // Surface Neutral
  positiveGreen: '#556B2F',    // Positive (Green) - Earthy olive
  negativeRed: '#8B3A2A',      // Negative (Red) - Muted brick red
};

export type ThemeMode = 'light' | 'dark' | 'system';

export const theme = (mode: ThemeMode) => ({
  mode,
  background: mode === 'light' ? '#FFFFFF' : colors.nearBlack,
  textPrimary: mode === 'light' ? colors.nearBlack : colors.neutralBeige,
  textSecondary: mode === 'light' ? colors.mutedGrey : colors.mutedGrey,
  textTertiary: mode === 'light' ? '#999' : '#666',
  card: mode === 'light' ? '#F7F5F0' : colors.earthyBrown,
  accent: colors.deepGold,
  border: mode === 'light' ? '#E3E0D6' : colors.earthyBrown,
  primary: colors.deepGold,
  primaryLight: mode === 'light' ? '#A58A20' : '#A58A20',
  primaryDark: mode === 'light' ? '#6B5408' : '#6B5408',
  success: colors.positiveGreen,
  danger: colors.negativeRed,
  // semantic usage - monochrome palette
  income: colors.positiveGreen,
  expense: colors.negativeRed,
});

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const fonts = {
  primaryStack: ['Inter', 'System', 'Helvetica Neue', 'Roboto', 'Segoe UI'],
};
