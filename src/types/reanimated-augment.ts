// Type support for DraggableWalletList
// Provides compatibility layer for Animated.SharedValue and gesture handler types

import 'react-native-reanimated';
import 'react-native-gesture-handler';

// Extend Animated namespace to support Animated.SharedValue<T> type annotation
declare global {
  namespace Animated {
    // This allows Animated.SharedValue<T> syntax to work in type annotations
    type SharedValue<T> = import('react-native-reanimated').SharedValue<T>;
  }
}

// Module augmentation for gesture handler
declare module 'react-native-gesture-handler' {
  interface PanGestureHandlerEventPayload {
    // Optional: add viewportHeight support if not present
    viewportHeight?: number;
  }
}

export {};
export type { SharedValue };



