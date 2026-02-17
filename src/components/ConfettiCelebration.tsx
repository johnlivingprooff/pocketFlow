import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPieceProps {
  color: string;
  delay: number;
}

function ConfettiPiece({ color, delay }: ConfettiPieceProps) {
  const position = useRef(new Animated.ValueXY({
    x: Math.random() * SCREEN_WIDTH,
    y: -20
  })).current;
  
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = 2000 + Math.random() * 1000;
    
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(position, {
          toValue: {
            x: position.x.__getValue() + (Math.random() - 0.5) * 200,
            y: SCREEN_HEIGHT + 50
          },
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: Math.random() * 720 - 360,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(duration * 0.7),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const size = 8 + Math.random() * 8;

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: size,
          height: size * 0.6,
          backgroundColor: color,
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate: rotation.interpolate({
              inputRange: [-360, 360],
              outputRange: ['-360deg', '360deg']
            })},
          ],
          opacity,
        },
      ]}
    />
  );
}

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

/**
 * Lightweight confetti celebration animation
 * Trigger when goals are achieved (100%)
 */
export function ConfettiCelebration({ visible, onComplete }: ConfettiCelebrationProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(1);
      
      // Auto-hide after animation completes
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          onComplete?.();
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  // Generate 50 confetti pieces
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 500,
  }));

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="none">
      {pieces.map(piece => (
        <ConfettiPiece key={piece.id} color={piece.color} delay={piece.delay} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});
