/**
 * Web Shell Layout Component
 * 
 * Desktop-optimized layout with:
 * - Collapsible left navigation rail
 * - Center content area
 * - Right profile/data panel
 * 
 * Responsive: collapses to single column on <1024px
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useColorScheme,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSettings } from '@/store/useStore';
import { theme } from '@/theme/theme';
import { LeftRail } from './LeftRail';
import { RightPanel } from './RightPanel';

interface WebShellProps {
  children: React.ReactNode;
}

export function WebShell({ children }: WebShellProps) {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  const [railExpanded, setRailExpanded] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth >= 1024;

  // On small screens, panels slide out; on large screens, they're always visible
  const railWidth = isLargeScreen || railExpanded ? 220 : 64;
  const shouldShowRightPanel = isLargeScreen || rightPanelOpen;

  if (Platform.OS !== 'web') {
    // Fallback: render children without web shell on mobile
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Left Rail Navigation */}
      <LeftRail
        expanded={railExpanded}
        onToggleExpand={() => setRailExpanded(!railExpanded)}
        theme={t}
        effectiveMode={effectiveMode}
      />

      {/* Center Content Area */}
      <View
        style={[
          styles.contentArea,
          {
            marginLeft: railWidth,
            marginRight: shouldShowRightPanel ? 320 : 0,
          },
        ]}
      >
        {children}
      </View>

      {/* Right Profile Panel */}
      {shouldShowRightPanel && (
        <RightPanel
          onClose={() => setRightPanelOpen(false)}
          theme={t}
          effectiveMode={effectiveMode}
        />
      )}

      {/* Mobile-only: Right Panel Toggle Button (floating) */}
      {!isLargeScreen && !rightPanelOpen && (
        <TouchableOpacity
          style={[
            styles.rightPanelToggle,
            {
              backgroundColor: t.primary,
              bottom: 24,
              right: 24,
            },
          ]}
          onPress={() => setRightPanelOpen(true)}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                backgroundColor: '#FFFFFF',
                borderRadius: 4,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 4,
                  height: 4,
                  backgroundColor: t.primary,
                  borderRadius: 2,
                  marginBottom: 2,
                }}
              />
              <View
                style={{
                  width: 4,
                  height: 4,
                  backgroundColor: t.primary,
                  borderRadius: 2,
                  marginBottom: 2,
                }}
              />
              <View
                style={{
                  width: 4,
                  height: 4,
                  backgroundColor: t.primary,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    ...(Platform.OS === 'web' && {
      display: 'flex' as any,
      width: '100%' as any,
      height: '100%' as any,
    }),
  },
  contentArea: {
    flex: 1,
    overflow: 'scroll' as any,
    ...(Platform.OS === 'web' && {
      display: 'flex' as any,
      flexDirection: 'column' as any,
    }),
  },
  rightPanelToggle: {
    position: 'absolute',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
