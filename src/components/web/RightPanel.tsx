/**
 * Right Profile Panel Component
 * 
 * Fixed right panel with:
 * - User avatar & name
 * - Theme toggle (light/dark/system)
 * - Storage mode toggle (browser/file)
 * - Backup/export/import controls
 * - Recent notifications/alerts
 * - Settings quick links
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSettings } from '@/store/useStore';
import { theme, ThemeMode } from '@/theme/theme';
import { Link } from 'expo-router';

interface RightPanelProps {
  onClose: () => void;
  theme: ReturnType<typeof theme>;
  effectiveMode: 'light' | 'dark';
}

export function RightPanel({
  onClose,
  theme: t,
  effectiveMode,
}: RightPanelProps) {
  const {
    themeMode,
    setThemeMode,
    userInfo,
    defaultCurrency,
  } = useSettings();

  const [storageMode, setStorageMode] = useState<'browser' | 'file'>('browser');
  const [isExporting, setIsExporting] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      // Import web driver utilities
      const { exportWebDatabase } = await import('@/lib/db/webDriver');
      const dbData = await exportWebDatabase();

      // Create blob and trigger download
      const blob = new Blob([dbData as any], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pocketflow_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.db';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExporting(true);
        try {
          const { importWebDatabase } = await import('@/lib/db/webDriver');
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          await importWebDatabase(uint8Array);

          // Refresh app data
          window.location.reload();
        } catch (error) {
          console.error('Import failed:', error);
        } finally {
          setIsExporting(false);
        }
      };
      input.click();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: '☀️ Light' },
    { value: 'dark', label: '🌙 Dark' },
    { value: 'system', label: '🔄 System' },
  ];

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: t.card,
          borderLeftColor: t.border,
        },
      ]}
    >
      {/* Close Button (mobile only - top right) */}
      <View style={styles.panelHeader}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={{ fontSize: 20, color: t.textSecondary }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <View style={styles.section}>
          <View style={styles.userProfile}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: t.primary },
              ]}
            >
              {userInfo?.profileImage ? (
                <Image
                  source={{ uri: userInfo.profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(userInfo?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  styles.userName,
                  { color: t.textPrimary },
                ]}
              >
                {userInfo?.name || 'User'}
              </Text>
              <Text
                style={[
                  styles.userSubtitle,
                  { color: t.textSecondary },
                ]}
              >
                {defaultCurrency}
              </Text>
            </View>
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>
            APPEARANCE
          </Text>
          <TouchableOpacity
            onPress={() => setShowThemeMenu(!showThemeMenu)}
            style={[
              styles.menuItem,
              { backgroundColor: t.background },
            ]}
          >
            <Text style={[styles.menuLabel, { color: t.textPrimary }]}>
              Theme
            </Text>
            <Text style={[styles.menuValue, { color: t.textSecondary }]}>
              {themeOptions.find((o) => o.value === themeMode)?.label}
            </Text>
          </TouchableOpacity>

          {showThemeMenu && (
            <View style={[styles.submenu, { backgroundColor: t.background }]}>
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setThemeMode(option.value);
                    setShowThemeMenu(false);
                  }}
                  style={[
                    styles.submenuItem,
                    themeMode === option.value && {
                      backgroundColor: t.primary + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.submenuLabel,
                      {
                        color:
                          themeMode === option.value
                            ? t.primary
                            : t.textPrimary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>
            STORAGE
          </Text>

          <View style={[styles.storageMode, { backgroundColor: t.background }]}>
            <View>
              <Text
                style={[
                  styles.storageLabel,
                  { color: t.textPrimary },
                ]}
              >
                Storage Mode
              </Text>
              <Text
                style={[
                  styles.storageValue,
                  { color: t.textSecondary },
                ]}
              >
                {storageMode === 'browser'
                  ? 'Browser (IndexedDB)'
                  : 'Local File'}
              </Text>
            </View>
            <Switch
              value={storageMode === 'file'}
              onValueChange={(value) =>
                setStorageMode(value ? 'file' : 'browser')
              }
            />
          </View>

          {isExporting ? (
            <View
              style={[
                styles.actionButton,
                { backgroundColor: t.background, opacity: 0.6 },
              ]}
            >
              <ActivityIndicator color={t.primary} />
              <Text
                style={[
                  styles.actionButtonLabel,
                  { color: t.textSecondary },
                ]}
              >
                Processing...
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleExportDatabase}
                style={[
                  styles.actionButton,
                  { backgroundColor: t.primary + '20' },
                ]}
              >
                <Text style={[styles.actionButtonLabel, { color: t.primary }]}>
                  ⬇️ Export Database
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleImportDatabase}
                style={[
                  styles.actionButton,
                  { backgroundColor: t.primary + '20' },
                ]}
              >
                <Text style={[styles.actionButtonLabel, { color: t.primary }]}>
                  ⬆️ Import Database
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Settings Link */}
        <View style={styles.section}>
          <Link href="/settings" asChild>
            <TouchableOpacity
              style={[
                styles.menuItem,
                { backgroundColor: t.background },
              ]}
            >
              <Text
                style={[
                  styles.menuLabel,
                  { color: t.primary, fontWeight: '600' },
                ]}
              >
                ⚙️ Full Settings
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>

      {/* Modal for theme menu */}
      <Modal
        visible={showThemeMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowThemeMenu(false)}
          activeOpacity={1}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 320,
    borderLeftWidth: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  userSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 12,
  },
  submenu: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  submenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  submenuLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  storageMode: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  storageValue: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
