import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme/theme';

interface TooltipProps {
  id: string; // Unique identifier for this tooltip
  title: string;
  message: string;
  triggerComponent: React.ReactNode;
  themeMode: 'light' | 'dark';
  onDismiss?: () => void;
  showOnce?: boolean; // Only show tooltip once per session
}

/**
 * Essential tooltip component for UI elements
 * Shows helpful hints on first interaction or when needed
 */
export function Tooltip({
  id,
  title,
  message,
  triggerComponent,
  themeMode,
  onDismiss,
  showOnce = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const t = theme(themeMode);

  useEffect(() => {
    // Check if tooltip has been shown before
    if (showOnce) {
      AsyncStorage.getItem(`tooltip_${id}`).then((value) => {
        setHasBeenShown(value === 'shown');
      });
    }
  }, [id, showOnce]);

  const handleShow = () => {
    if (hasBeenShown && showOnce) {
      return;
    }
    setIsVisible(true);
  };

  const handleDismiss = () => {
    if (showOnce && !hasBeenShown) {
      AsyncStorage.setItem(`tooltip_${id}`, 'shown');
      setHasBeenShown(true);
    }
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <>
      <Pressable onPress={handleShow}>
        {triggerComponent}
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleDismiss}
        >
          <View style={[styles.tooltip, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.title, { color: t.textPrimary }]}>
              {title}
            </Text>
            <Text style={[styles.message, { color: t.textSecondary }]}>
              {message}
            </Text>
            <Pressable
              style={[styles.dismissButton, { borderColor: t.border }]}
              onPress={handleDismiss}
            >
              <Text style={[styles.dismissText, { color: t.textPrimary }]}>
                Got it
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    maxWidth: Dimensions.get('window').width - 40,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  dismissButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
