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

export type ReminderPermissionStatus = 'granted' | 'denied' | 'undetermined';

interface SettingsState {
  // User Info
  userInfo: UserInfo;
  // Preferences
  themeMode: ThemeMode;
  defaultCurrency: string;
  // Reminders
  remindersEnabled: boolean;
  reminderPreferredTimeLocal: string; // HH:MM in device local time
  reminderQuietHoursStart: string | null; // HH:MM
  reminderQuietHoursEnd: string | null; // HH:MM
  reminderLastDeliveredAtUtc: string | null; // ISO timestamp in UTC
  reminderLastDeliveredLocalDate: string | null; // YYYY-MM-DD at delivery time
  reminderNextScheduledAtUtc: string | null; // ISO timestamp in UTC
  reminderPermissionStatus: ReminderPermissionStatus;
  // Security
  biometricEnabled: boolean;
  biometricSetupComplete: boolean;
  lastAuthTime: number | null;
  // Backups
  lastBackupAt: number | null;
  // Privacy
  hideBalances: boolean;
  // Smart Defaults
  lastUsedWalletId: number | null;
  lastUsedCategory: string | null;
  // Image picking state for biometric auth delay
  imagePickingStartTime: number | null;
  // Actions
  setUserInfo: (info: Partial<UserInfo>) => void;
  setThemeMode: (m: ThemeMode) => void;
  setDefaultCurrency: (c: string) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  setReminderPreferredTimeLocal: (time: string) => void;
  setReminderQuietHours: (start: string | null, end: string | null) => void;
  setReminderLastDelivered: (deliveredAtUtc: string | null, deliveredLocalDate: string | null) => void;
  setReminderNextScheduledAtUtc: (nextScheduledAtUtc: string | null) => void;
  setReminderPermissionStatus: (status: ReminderPermissionStatus) => void;
  setBiometricEnabled: (v: boolean) => void;
  setBiometricSetupComplete: (v: boolean) => void;
  setLastAuthTime: (time: number | null) => void;
  setLastBackupAt: (time: number | null) => void;
  setHideBalances: (v: boolean) => void;
  setLastUsedWalletId: (id: number | null) => void;
  setLastUsedCategory: (category: string | null) => void;
  setImagePickingStartTime: (time: number | null) => void;
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
  remindersEnabled: false,
  reminderPreferredTimeLocal: '20:00',
  reminderQuietHoursStart: null,
  reminderQuietHoursEnd: null,
  reminderLastDeliveredAtUtc: null,
  reminderLastDeliveredLocalDate: null,
  reminderNextScheduledAtUtc: null,
  reminderPermissionStatus: 'undetermined' as ReminderPermissionStatus,
  biometricEnabled: false,
  biometricSetupComplete: false,
  lastAuthTime: null,
  lastBackupAt: null,
  hideBalances: false,
  lastUsedWalletId: null,
  lastUsedCategory: null,
  imagePickingStartTime: null,
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
      setRemindersEnabled: (remindersEnabled) => set({ remindersEnabled }),
      setReminderPreferredTimeLocal: (reminderPreferredTimeLocal) => set({ reminderPreferredTimeLocal }),
      setReminderQuietHours: (reminderQuietHoursStart, reminderQuietHoursEnd) =>
        set({ reminderQuietHoursStart, reminderQuietHoursEnd }),
      setReminderLastDelivered: (reminderLastDeliveredAtUtc, reminderLastDeliveredLocalDate) =>
        set({ reminderLastDeliveredAtUtc, reminderLastDeliveredLocalDate }),
      setReminderNextScheduledAtUtc: (reminderNextScheduledAtUtc) => set({ reminderNextScheduledAtUtc }),
      setReminderPermissionStatus: (reminderPermissionStatus) => set({ reminderPermissionStatus }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setBiometricSetupComplete: (biometricSetupComplete) => set({ biometricSetupComplete }),
      setLastAuthTime: (lastAuthTime) => set({ lastAuthTime }),
      setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
      setHideBalances: (hideBalances) => set({ hideBalances }),
      setLastUsedWalletId: (lastUsedWalletId) => set({ lastUsedWalletId }),
      setLastUsedCategory: (lastUsedCategory) => set({ lastUsedCategory }),
      setImagePickingStartTime: (imagePickingStartTime) => set({ imagePickingStartTime }),
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
  isPickingImage: boolean;
  setActiveWalletId: (id?: number) => void;
  setIsPickingImage: (picking: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  activeWalletId: undefined,
  isPickingImage: false,
  setActiveWalletId: (id) => set({ activeWalletId: id }),
  setIsPickingImage: (picking) => set({ isPickingImage: picking }),
}));
