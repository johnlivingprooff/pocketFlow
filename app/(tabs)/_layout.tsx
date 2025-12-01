import React from 'react';
import { Pressable, useColorScheme } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { HomeIcon } from '../../src/assets/icons/HomeIcon';
import { WalletsIcon } from '../../src/assets/icons/WalletsIcon';
import { AnalyticsIcon } from '../../src/assets/icons/AnalyticsIcon';
import { SettingsIcon } from '../../src/assets/icons/SettingsIcon';
import { PlusIcon } from '../../src/assets/icons/PlusIcon';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';

export default function TabsLayout() {
  const router = useRouter();
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarStyle: {
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
          backgroundColor: t.card,
          borderTopColor: t.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: 'Wallets',
          tabBarIcon: ({ color, focused }) => (
            <WalletsIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-placeholder"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <Pressable
              onPress={() => router.push('/transactions/add')}
              style={({ pressed }) => ({
                top: -20,
                justifyContent: 'center',
                alignItems: 'center',
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: t.primary,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <PlusIcon />
            </Pressable>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <AnalyticsIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <SettingsIcon color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
