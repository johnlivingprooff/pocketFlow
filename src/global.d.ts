/**
 * Global type declarations for compatibility with DraggableWalletList
 * Provides Animated.SharedValue<T> and extended gesture handler types
 */

// Support Animated.SharedValue<T> type annotation pattern
declare global {
  namespace Animated {
    type SharedValue<T> = import('react-native-reanimated').SharedValue<T>;
  }
}

// Extend gesture handler to include viewportHeight property
declare module 'react-native-gesture-handler' {
  interface GestureUpdateEvent<T = Record<string, unknown>> {
    viewportHeight?: number;
  }
}

export {};

