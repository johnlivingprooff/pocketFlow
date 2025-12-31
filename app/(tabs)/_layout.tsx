import React from 'react';
import { Pressable, useColorScheme, Alert } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon } from '../../src/assets/icons/HomeIcon';
import { WalletsIcon } from '../../src/assets/icons/WalletsIcon';
import { AnalyticsIcon } from '../../src/assets/icons/AnalyticsIcon';
import { SettingsIcon } from '../../src/assets/icons/SettingsIcon';
import { PlusIcon } from '../../src/assets/icons/PlusIcon';
import { useSettings } from '../../src/store/useStore';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { theme } from '../../src/theme/theme';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { themeMode } = useSettings();
  const { wallets } = useWallets();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const insets = useSafeAreaInsets();

  // On Android with 3-button nav, insets.bottom > 0. Use it to lift the bar; gesture nav reports 0 so it stays flush.
  const bottomPadding = insets.bottom;
  const tabBarHeight = 60 + insets.bottom;

  // Tab navigation order
  const tabs = ['index', 'wallets', 'analytics', 'settings'];
  
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      const { translationX, velocityX, translationY } = event;
      
      // Only trigger swipe navigation if:
      // 1. Horizontal movement is significant (> 80px)
      // 2. Horizontal velocity is high enough (> 800)
      // 3. Much more horizontal than vertical movement (ratio > 3)
      // 4. Not too much vertical movement (< 30px)
      const horizontalRatio = Math.abs(translationX) / Math.abs(translationY || 1);
      
      if (Math.abs(translationX) > 80 && 
          Math.abs(velocityX) > 800 && 
          horizontalRatio > 3 && 
          Math.abs(translationY) < 30) {
        
        // Get current tab
        const currentPath = pathname;
        let currentTabIndex = -1;
        
        if (currentPath.includes('/(tabs)/index') || currentPath === '/(tabs)' || currentPath === '/') currentTabIndex = 0;
        else if (currentPath.includes('/(tabs)/wallets')) currentTabIndex = 1;
        else if (currentPath.includes('/(tabs)/analytics')) currentTabIndex = 2;
        else if (currentPath.includes('/(tabs)/settings')) currentTabIndex = 3;
        
        if (currentTabIndex !== -1) {
          let nextTabIndex = currentTabIndex;
          
          if (translationX > 0) {
            // Swipe right - go to previous tab
            nextTabIndex = Math.max(0, currentTabIndex - 1);
          } else {
            // Swipe left - go to next tab
            nextTabIndex = Math.min(tabs.length - 1, currentTabIndex + 1);
          }
          
          if (nextTabIndex !== currentTabIndex) {
            const nextTab = tabs[nextTabIndex];
            if (nextTab === 'index') {
              router.replace('/(tabs)');
            } else {
              router.replace(`/(tabs)/${nextTab}`);
            }
          }
        }
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: t.primary,
          tabBarInactiveTintColor: t.textTertiary,
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: bottomPadding,
            paddingTop: 0,
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
              onPress={() => {
                if (wallets.length === 0) {
                  Alert.alert(
                    'No Wallet Created',
                    'Please create a wallet first before adding a transaction.',
                    [
                      {
                        text: 'Create Wallet',
                        onPress: () => router.push('/wallets/create'),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                } else {
                  router.push('/transactions/add');
                }
              }}
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
    </GestureDetector>
  );
}
