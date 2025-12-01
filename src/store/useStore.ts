import { create } from 'zustand';
import { ThemeMode } from '../theme/theme';

interface SettingsState {
  themeMode: ThemeMode;
  defaultCurrency: string;
  biometricEnabled: boolean;
  setThemeMode: (m: ThemeMode) => void;
  setDefaultCurrency: (c: string) => void;
  setBiometricEnabled: (v: boolean) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  themeMode: 'system',
  defaultCurrency: 'MWK',
  biometricEnabled: false,
  setThemeMode: (mode) => set({ themeMode: mode }),
  setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
}));

interface UIState {
  activeWalletId?: number;
  setActiveWalletId: (id?: number) => void;
}

export const useUI = create<UIState>((set) => ({
  activeWalletId: undefined,
  setActiveWalletId: (id) => set({ activeWalletId: id }),
}));
