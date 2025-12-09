import { create } from 'zustand';
import { ThemeMode } from '../theme/theme';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserInfo {
  name: string;
  email: string;
  phone: string;
  profileImage: string | null;
}

interface SettingsState {
  // User Info
  userInfo: UserInfo;
  // Preferences
  themeMode: ThemeMode;
  defaultCurrency: string;
  // Security
  biometricEnabled: boolean;
  biometricSetupComplete: boolean;
  lastAuthTime: number | null;
  // Backups
  lastBackupAt: number | null;
  // Actions
  setUserInfo: (info: Partial<UserInfo>) => void;
  setThemeMode: (m: ThemeMode) => void;
  setDefaultCurrency: (c: string) => void;
  setBiometricEnabled: (v: boolean) => void;
  setBiometricSetupComplete: (v: boolean) => void;
  setLastAuthTime: (time: number | null) => void;
  setLastBackupAt: (time: number | null) => void;
  resetSettings: () => void;
}

const initialState = {
  userInfo: {
    name: 'User',
    email: '',
    phone: '',
    profileImage: null,
  },
  themeMode: 'system' as ThemeMode,
  defaultCurrency: 'MWK',
  biometricEnabled: false,
  biometricSetupComplete: false,
  lastAuthTime: null,
  lastBackupAt: null,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setUserInfo: (info) => set((state) => ({ 
        userInfo: { ...state.userInfo, ...info } 
      })),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setBiometricSetupComplete: (biometricSetupComplete) => set({ biometricSetupComplete }),
      setLastAuthTime: (lastAuthTime) => set({ lastAuthTime }),
      setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
      resetSettings: () => set(initialState),
    }),
    {
      name: 'pocketflow-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

interface UIState {
  activeWalletId?: number;
  setActiveWalletId: (id?: number) => void;
}

export const useUI = create<UIState>((set) => ({
  activeWalletId: undefined,
  setActiveWalletId: (id) => set({ activeWalletId: id }),
}));
