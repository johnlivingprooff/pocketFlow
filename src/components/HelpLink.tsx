import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Platform, useColorScheme } from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';

interface HelpLinkProps {
  title: string;
  items: string[];
  label?: string;
}

const TAP_OPACITY = 0.7;

/**
 * Hyperlink-style help trigger at the bottom of screens.
 * Opens a themed modal with the given "how it works" bullet points.
 */
export function HelpLink({ title, items, label = 'Learn how it works' }: HelpLinkProps) {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const mode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(mode);
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={TAP_OPACITY}
        onPress={() => setVisible(true)}
        style={styles.linkWrap}
        hitSlop={{ top: 8, bottom: 8 }}
      >
        <Text style={StyleSheet.flatten([styles.linkText, { color: t.primary }]) as any}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={StyleSheet.flatten([styles.container, { backgroundColor: t.card, borderColor: t.border }]) as any}>
            <View style={StyleSheet.flatten([styles.header, { borderBottomColor: t.border }]) as any}>
              <Text style={StyleSheet.flatten([styles.title, { color: t.textPrimary }]) as any}>{title}</Text>
            </View>
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {items.map((item, i) => (
                <View key={i} style={styles.row}>
                  <Text style={StyleSheet.flatten([styles.bullet, { color: t.primary }]) as any}>•</Text>
                  <Text style={StyleSheet.flatten([styles.itemText, { color: t.textSecondary }]) as any}>{item}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={TAP_OPACITY}
                onPress={() => setVisible(false)}
                style={StyleSheet.flatten([styles.closeButton, { backgroundColor: t.primary }]) as any}
              >
                <Text style={styles.closeText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  linkWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '70%',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  closeButton: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});