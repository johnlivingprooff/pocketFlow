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
    <View style={[
      styles.previewCard,
      { 
        backgroundColor: previewTheme.card,
        borderColor: isSelected ? previewTheme.primary : previewTheme.border,
        borderWidth: isSelected ? 2 : 1,
      }
    ]}>
      {/* Header preview */}
      <View style={[styles.headerPreview, { backgroundColor: previewTheme.background }]}>
        <View style={[styles.circle, { backgroundColor: previewTheme.primary }]} />
        <View style={[styles.line, { backgroundColor: previewTheme.textPrimary, width: '60%' }]} />
      </View>
      
      {/* Card preview */}
      <View style={[styles.cardPreview, { backgroundColor: previewTheme.card, borderColor: previewTheme.border }]}>
        <View style={[styles.smallLine, { backgroundColor: previewTheme.textPrimary }]} />
        <View style={[styles.smallLine, { backgroundColor: previewTheme.textSecondary, width: '70%' }]} />
        
        {/* Button preview */}
        <View style={[styles.buttonPreview, { backgroundColor: previewTheme.primary }]}>
          <View style={[styles.buttonLine, { backgroundColor: '#FFFFFF' }]} />
        </View>
      </View>
      
      {/* Color dots */}
      <View style={styles.colorDots}>
        <View style={[styles.dot, { backgroundColor: previewTheme.primary }]} />
        <View style={[styles.dot, { backgroundColor: previewTheme.success }]} />
        <View style={[styles.dot, { backgroundColor: previewTheme.danger }]} />
        <View style={[styles.dot, { backgroundColor: previewTheme.warning }]} />
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
