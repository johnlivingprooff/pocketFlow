import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

interface SkeletonProps {
  colors: {
    card: string;
    border: string;
    background: string;
  };
  variant?: 'card' | 'list-item' | 'text' | 'circle';
  width?: number | string;
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Reusable skeleton loader with dynamic sizing
 */
export function Skeleton({ 
  colors, 
  variant = 'card',
  width = '100%',
  height 
}: SkeletonProps) {
  const getDimensions = () => {
    switch (variant) {
      case 'card':
        return { 
          width: typeof width === 'number' ? width : SCREEN_WIDTH - 32, 
          height: height || 100 
        };
      case 'list-item':
        return { 
          width: typeof width === 'number' ? width : SCREEN_WIDTH - 32, 
          height: height || 72 
        };
      case 'text':
        return { 
          width: typeof width === 'number' ? width : '80%', 
          height: height || 12 
        };
      case 'circle':
        return { 
          width: height || 48, 
          height: height || 48 
        };
      default:
        return { 
          width: typeof width === 'number' ? width : SCREEN_WIDTH - 32, 
          height: height || 100 
        };
    }
  };

  const dims = getDimensions();

  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.border,
          width: dims.width,
          height: dims.height,
          borderRadius: variant === 'circle' ? dims.height / 2 : 8,
        },
      ]}
    />
  );
}

interface SkeletonCardProps {
  colors: {
    card: string;
    border: string;
    background: string;
  };
  lines?: number;
  showHeader?: boolean;
  showFooter?: boolean;
}

/**
 * Card skeleton with header, content lines, and footer
 */
export function SkeletonCard({ 
  colors, 
  lines = 2, 
  showHeader = true,
  showFooter = true 
}: SkeletonCardProps) {
  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {showHeader && (
        <View style={styles.header}>
          <Skeleton colors={colors} variant="circle" height={40} />
          <View style={styles.headerText}>
            <Skeleton colors={colors} variant="text" width="60%" height={16} />
            <Skeleton colors={colors} variant="text" width="40%" height={12} />
          </View>
        </View>
      )}
      
      <View style={styles.content}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            colors={colors} 
            variant="text" 
            width={i === lines - 1 ? '60%' : '100%'} 
            height={12} 
          />
        ))}
      </View>

      {showFooter && (
        <View style={styles.footer}>
          <Skeleton colors={colors} variant="text" width="30%" height={12} />
          <Skeleton colors={colors} variant="text" width="20%" height={12} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    opacity: 0.3,
  },
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
    gap: 6,
  },
  content: {
    gap: 8,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
});
