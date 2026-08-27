/**
 * Left Navigation Rail Component
 * 
 * Collapsible sidebar with navigation items:
 * - Home
 * - Wallets
 * - Analytics
 * - Categories
 * - Budgets
 * - Goals
 * - + Add Transaction (prominent CTA)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { theme, ThemeMode } from '@/theme/theme';

// Icon components - simple geometric shapes for web
const HomeIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>🏠</Text>
  </View>
);

const WalletsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>💳</Text>
  </View>
);

const SharedIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>👥</Text>
  </View>
);

const AnalyticsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>📊</Text>
  </View>
);

const CategoriesIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>🏷️</Text>
  </View>
);

const BudgetsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>💰</Text>
  </View>
);

const GoalsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>🎯</Text>
  </View>
);

const PlusIcon = () => (
  <Text style={{ fontSize: 24, fontWeight: '300', color: '#FFFFFF' }}>+</Text>
);

const ChevronIcon = ({ color }: { color: string }) => (
  <Text style={{ fontSize: 18, color }}>‹</Text>
);

interface NavItem {
  label: string;
  route: string;
  icon: ({ color }: { color: string }) => React.ReactNode;
  webOnly?: boolean;
  appOnlyOnWeb?: boolean;
  badge?: string;
}

interface LeftRailProps {
  expanded: boolean;
  onToggleExpand: () => void;
  theme: ReturnType<typeof theme>;
  effectiveMode: Exclude<ThemeMode, 'system'>;
}

export function LeftRail({
  expanded,
  onToggleExpand,
  theme: t,
  effectiveMode,
}: LeftRailProps) {
  const router = useRouter();
  const segments = useSegments();

  const isWeb = Platform.OS === 'web';

  // On web we ONLY expose shared-wallet capable areas; everything else is app-only.
  const navItems: NavItem[] = isWeb
    ? [
        { label: 'Home', route: '/(tabs)', icon: HomeIcon },
        { label: 'Wallets', route: '/(tabs)/wallets', icon: WalletsIcon },
        { label: 'Shared', route: '/settings/shared-wallets', icon: SharedIcon },
        { label: 'Analytics', route: '/(tabs)/analytics', icon: AnalyticsIcon, appOnlyOnWeb: true, badge: 'App only' },
        { label: 'Categories', route: '/categories', icon: CategoriesIcon, appOnlyOnWeb: true, badge: 'App only' },
        { label: 'Budgets', route: '/budgets', icon: BudgetsIcon, appOnlyOnWeb: true, badge: 'App only' },
        { label: 'Goals', route: '/goals', icon: GoalsIcon, appOnlyOnWeb: true, badge: 'App only' },
      ]
    : [
        { label: 'Home', route: '/(tabs)', icon: HomeIcon },
        { label: 'Wallets', route: '/(tabs)/wallets', icon: WalletsIcon },
        { label: 'Analytics', route: '/(tabs)/analytics', icon: AnalyticsIcon },
        { label: 'Categories', route: '/categories', icon: CategoriesIcon },
        { label: 'Budgets', route: '/budgets', icon: BudgetsIcon },
        { label: 'Goals', route: '/goals', icon: GoalsIcon },
      ];

  const currentRoute = useMemo(() => {
    if (segments.includes('settings') && segments.includes('shared-wallets')) return '/settings/shared-wallets';
    if (segments.includes('wallets')) return '/(tabs)/wallets';
    if (segments.includes('analytics')) return '/(tabs)/analytics';
    if (segments.includes('categories')) return '/categories';
    if (segments.includes('budgets')) return '/budgets';
    if (segments.includes('goals')) return '/goals';
    return '/(tabs)';
  }, [segments]);

  const handleNavPress = (route: string, appOnlyOnWeb?: boolean) => {
    if (appOnlyOnWeb && isWeb) {
      // No-op: app-only features show banner instead of navigating. Still push to allow banner screen to render.
    }
    router.push(route as never);
  };

  const handleAddPress = () => {
    router.push('/transactions/add' as never);
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  const railWidth = expanded ? 220 : 64;

  return (
    <View
      style={StyleSheet.flatten([
        styles.rail,
        {
          width: railWidth,
          backgroundColor: t.card,
          borderRightColor: t.border,
        },
      ]) as any}
    >
      {/* Header with toggle */}
      <View
        style={StyleSheet.flatten([
          styles.railHeader,
          {
            paddingHorizontal: expanded ? 12 : 8,
            borderBottomColor: t.border,
          },
        ]) as any}
      >
        <TouchableOpacity
          onPress={onToggleExpand}
          style={StyleSheet.flatten([
            styles.toggleButton,
            {
              transform: [{ rotateZ: expanded ? '180deg' : '0deg' }],
            },
          ]) as any}
        >
          <ChevronIcon color={t.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Navigation Items */}
      <View style={styles.navList}>
        {navItems.map((item) => {
          const isActive = currentRoute === item.route;
          const disabledOnWeb = Boolean(item.appOnlyOnWeb && isWeb);
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => handleNavPress(item.route, item.appOnlyOnWeb)}
              style={StyleSheet.flatten([
                styles.navItem,
                expanded && styles.navItemExpanded,
                isActive && {
                  backgroundColor: disabledOnWeb ? t.border : t.primary,
                },
                disabledOnWeb && { opacity: 0.55 },
              ]) as any}
            >
              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                {item.icon({ color: isActive ? '#FFFFFF' : t.textPrimary })}
              </View>
              {expanded && (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text
                    style={StyleSheet.flatten([
                      styles.navLabel,
                      {
                        color: isActive ? '#FFFFFF' : t.textPrimary,
                      },
                    ]) as any}
                  >
                    {item.label}
                  </Text>
                  {item.badge && expanded ? (
                    <Text style={{ fontSize: 9, fontWeight: '700', color: isActive ? '#FFFFFF' : t.textSecondary, backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : t.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                      {item.badge}
                    </Text>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add Transaction Button (prominent CTA) */}
      <View
        style={StyleSheet.flatten([
          styles.addButton,
          {
            paddingHorizontal: expanded ? 12 : 8,
          },
        ]) as any}
      >
        <TouchableOpacity
          onPress={handleAddPress}
          style={StyleSheet.flatten([
            styles.addButtonInner,
            expanded && styles.addButtonExpanded,
            {
              backgroundColor: t.primary,
            },
          ]) as any}
        >
          <PlusIcon />
          {expanded && (
            <Text style={styles.addButtonLabel}>Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'relative',
    borderRightWidth: 1,
    paddingVertical: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  railHeader: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  toggleButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 8,
    gap: 8,
  },
  navItem: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navItemExpanded: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  addButton: {
    paddingBottom: 8,
  },
  addButtonInner: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonExpanded: {
    flexDirection: 'row',
    gap: 8,
  },
  addButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
