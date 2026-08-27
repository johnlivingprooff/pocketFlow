import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeMode, theme } from '../theme/theme';

interface ThemePreviewProps {
  themeMode: ThemeMode;
  isSelected?: boolean;
}

/**
 * Preview card showing how a theme will look
 */
export function ThemePreview({ themeMode, isSelected }: ThemePreviewProps) {
  // Generate theme colors for preview
  const previewTheme = theme(themeMode, 'light');
  
  return (
    <View style={StyleSheet.flatten([
      styles.previewCard,
      { 
        backgroundColor: previewTheme.card,
        borderColor: isSelected ? previewTheme.primary : previewTheme.border,
        borderWidth: isSelected ? 2 : 1,
      }
    ]) as any}>
      {/* Header preview */}
      <View style={StyleSheet.flatten([styles.headerPreview, { backgroundColor: previewTheme.background }]) as any}>
        <View style={StyleSheet.flatten([styles.circle, { backgroundColor: previewTheme.primary }]) as any} />
        <View style={StyleSheet.flatten([styles.line, { backgroundColor: previewTheme.textPrimary, width: '60%' }]) as any} />
      </View>
      
      {/* Card preview */}
      <View style={StyleSheet.flatten([styles.cardPreview, { backgroundColor: previewTheme.card, borderColor: previewTheme.border }]) as any}>
        <View style={StyleSheet.flatten([styles.smallLine, { backgroundColor: previewTheme.textPrimary }]) as any} />
        <View style={StyleSheet.flatten([styles.smallLine, { backgroundColor: previewTheme.textSecondary, width: '70%' }]) as any} />
        
        {/* Button preview */}
        <View style={StyleSheet.flatten([styles.buttonPreview, { backgroundColor: previewTheme.primary }]) as any}>
          <View style={StyleSheet.flatten([styles.buttonLine, { backgroundColor: '#FFFFFF' }]) as any} />
        </View>
      </View>
      
      {/* Color dots */}
      <View style={styles.colorDots}>
        <View style={StyleSheet.flatten([styles.dot, { backgroundColor: previewTheme.primary }]) as any} />
        <View style={StyleSheet.flatten([styles.dot, { backgroundColor: previewTheme.success }]) as any} />
        <View style={StyleSheet.flatten([styles.dot, { backgroundColor: previewTheme.danger }]) as any} />
        <View style={StyleSheet.flatten([styles.dot, { backgroundColor: previewTheme.warning }]) as any} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    width: 120,
    height: 140,
    borderRadius: 12,
    padding: 8,
    overflow: 'hidden',
  },
  headerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    padding: 4,
    borderRadius: 6,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  line: {
    height: 8,
    borderRadius: 4,
    width: '50%',
  },
  cardPreview: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 6,
    flex: 1,
  },
  smallLine: {
    height: 6,
    borderRadius: 3,
    width: '80%',
  },
  buttonPreview: {
    height: 20,
    borderRadius: 4,
    marginTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLine: {
    height: 4,
    borderRadius: 2,
    width: '50%',
  },
  colorDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
