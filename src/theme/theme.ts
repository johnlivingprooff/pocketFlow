export const colors = {
  mutedGrey: '#6B6658',
  nearBlack: '#010000',
  neutralBeige: '#B3B09E',
  deepGold: '#84670B',
  earthyBrown: '#332D23',
};

export type ThemeMode = 'light' | 'dark';

export const theme = (mode: ThemeMode) => ({
  mode,
  background: mode === 'light' ? '#FFFFFF' : colors.nearBlack,
  textPrimary: mode === 'light' ? colors.nearBlack : '#F2F2F2',
  textSecondary: mode === 'light' ? colors.mutedGrey : '#CFCFCF',
  card: mode === 'light' ? '#F7F5F0' : '#161412',
  accent: colors.deepGold,
  border: mode === 'light' ? '#E3E0D6' : '#2B2620',
  // semantic usage
  income: '#2e7d32',
  expense: '#c62828',
});

export const fonts = {
  primaryStack: ['Inter', 'System', 'Helvetica Neue', 'Roboto', 'Segoe UI'],
};
