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
  card: mode === 'light' ? '#F7F5F0' : colors.earthyBrown,
  accent: colors.deepGold,
  border: mode === 'light' ? '#E3E0D6' : colors.earthyBrown,
  // semantic usage - monochrome palette
  income: colors.positiveGreen,
  expense: colors.negativeRed,
});

export const fonts = {
  primaryStack: ['Inter', 'System', 'Helvetica Neue', 'Roboto', 'Segoe UI'],
};
