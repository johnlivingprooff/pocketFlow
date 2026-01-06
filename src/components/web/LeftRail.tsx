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
import { useSettings } from '@/store/useStore';
import { theme, shadows } from '@/theme/theme';

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
}

interface LeftRailProps {
  expanded: boolean;
  onToggleExpand: () => void;
  theme: ReturnType<typeof theme>;
  effectiveMode: 'light' | 'dark';
}

export function LeftRail({
  expanded,
  onToggleExpand,
  theme: t,
  effectiveMode,
}: LeftRailProps) {
  const router = useRouter();
  const segments = useSegments();

  const navItems: NavItem[] = [
    { label: 'Home', route: '/(tabs)', icon: HomeIcon },
    { label: 'Wallets', route: '/(tabs)/wallets', icon: WalletsIcon },
    { label: 'Analytics', route: '/(tabs)/analytics', icon: AnalyticsIcon },
    { label: 'Categories', route: '/categories', icon: CategoriesIcon },
    { label: 'Budgets', route: '/budgets', icon: BudgetsIcon },
    { label: 'Goals', route: '/goals', icon: GoalsIcon },
  ];

  const currentRoute = useMemo(() => {
    // Match current route to nav items
    if (segments.includes('wallets')) return '/(tabs)/wallets';
    if (segments.includes('analytics')) return '/(tabs)/analytics';
    if (segments.includes('categories')) return '/categories';
    if (segments.includes('budgets')) return '/budgets';
    if (segments.includes('goals')) return '/goals';
    return '/(tabs)';
  }, [segments]);

  const handleNavPress = (route: string) => {
    router.push(route);
  };

  const handleAddPress = () => {
    router.push('/transactions/add');
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  const railWidth = expanded ? 220 : 64;

  return (
    <View
      style={[
        styles.rail,
        {
          width: railWidth,
          backgroundColor: t.card,
          borderRightColor: t.border,
        },
      ]}
    >
      {/* Header with toggle */}
      <View
        style={[
          styles.railHeader,
          {
            paddingHorizontal: expanded ? 12 : 8,
            borderBottomColor: t.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onToggleExpand}
          style={[
            styles.toggleButton,
            {
              transform: [{ rotateZ: expanded ? '180deg' : '0deg' }],
            },
          ]}
        >
          <ChevronIcon color={t.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Navigation Items */}
      <View style={styles.navList}>
        {navItems.map((item, idx) => {
          const isActive = currentRoute === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => handleNavPress(item.route)}
              style={[
                styles.navItem,
                expanded && styles.navItemExpanded,
                isActive && {
                  backgroundColor: t.primary,
                },
              ]}
            >
              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                {item.icon({ color: isActive ? '#FFFFFF' : t.textPrimary })}
              </View>
              {expanded && (
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: isActive ? '#FFFFFF' : t.textPrimary,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add Transaction Button (prominent CTA) */}
      <View
        style={[
          styles.addButton,
          {
            paddingHorizontal: expanded ? 12 : 8,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleAddPress}
          style={[
            styles.addButtonInner,
            expanded && styles.addButtonExpanded,
            {
              backgroundColor: t.primary,
            },
          ]}
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
