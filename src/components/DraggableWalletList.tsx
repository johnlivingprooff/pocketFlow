import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
    SharedValue,
} from 'react-native-reanimated';
import { Link } from 'expo-router';
import { Wallet } from '../types/wallet';
import { WalletCard } from './WalletCard';
import { updateWalletsOrder } from '../lib/db/wallets';
import { theme } from '../theme/theme';

const CARD_HEIGHT = 170; // Tuned height of WalletCard + margin to avoid clustering
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

interface DraggableWalletListProps {
  wallets: Wallet[];
  balances: Record<number, number>;
  themeMode: 'light' | 'dark' | 'system';
  onOrderChange?: () => void;
  showLinks?: boolean; // Whether to wrap cards with navigation Links
}

interface DraggableWalletItemProps {
  wallet: Wallet;
  balance: number;
  themeMode: 'light' | 'dark' | 'system';
  index: number;
    positions: SharedValue<number[]>;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  showLink?: boolean;
}

function DraggableWalletItem({
  wallet,
  balance,
  themeMode,
  index,
  positions,
  onDragEnd,
  showLink = true,
}: DraggableWalletItemProps) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
    const startY = useSharedValue(0);
    const startIndex = useSharedValue(index);

    const panGesture = Gesture.Pan()
      .onStart(() => {
        startY.value = translateY.value;
        startIndex.value = index;
      isDragging.value = true;
      })
      .onUpdate((event) => {
        translateY.value = startY.value + event.translationY;

      // Calculate new position based on drag
        const newIndex = Math.round((startIndex.value * CARD_HEIGHT + translateY.value) / CARD_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(positions.value.length - 1, newIndex));

      // Update positions array
      if (clampedIndex !== positions.value[index]) {
        const newPositions = [...positions.value];
        const oldIndex = newPositions.indexOf(index);
        const targetIndex = newPositions.indexOf(clampedIndex);
        
        if (oldIndex !== -1 && targetIndex !== -1) {
          // Swap positions
          newPositions[oldIndex] = clampedIndex;
          newPositions[targetIndex] = index;
          positions.value = newPositions;
        }
      }
      })
      .onEnd(() => {
      isDragging.value = false;
      
      // Calculate final position
        const newIndex = Math.round((startIndex.value * CARD_HEIGHT + translateY.value) / CARD_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(positions.value.length - 1, newIndex));
      
      // Snap to position
      translateY.value = withSpring(0, SPRING_CONFIG);
      
      // Notify parent of order change
        if (clampedIndex !== startIndex.value) {
          runOnJS(onDragEnd)(startIndex.value, clampedIndex);
      }
      });

  const animatedStyle = useAnimatedStyle(() => {
    // Find where this item should be positioned
    const targetIndex = positions.value.indexOf(index);
    const targetY = targetIndex * CARD_HEIGHT;
    
    return {
      transform: [
        {
          translateY: isDragging.value
            ? translateY.value
            : withSpring(targetY - index * CARD_HEIGHT, SPRING_CONFIG),
        },
      ],
      zIndex: isDragging.value ? 100 : 1,
      opacity: isDragging.value ? 0.8 : 1,
    };
  });

    // Resolve themeMode to 'light' or 'dark'
    const resolvedMode: 'light' | 'dark' = themeMode === 'system' ? 'light' : themeMode;

  const cardContent = (
    <View style={{ marginBottom: 12 }}>
      <WalletCard
        name={wallet.name}
        balance={balance}
        currency={wallet.currency}
        color={wallet.color}
          mode={resolvedMode}
      />
    </View>
  );

  if (showLink) {
    return (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.draggableItem, animatedStyle]}>
          <Link href={`/wallets/${wallet.id}`} asChild>
            <TouchableOpacity activeOpacity={0.8}>
              {cardContent}
            </TouchableOpacity>
          </Link>
        </Animated.View>
        </GestureDetector>
    );
  }

  return (
      <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.draggableItem, animatedStyle]}>
        {cardContent}
      </Animated.View>
      </GestureDetector>
  );
}

export function DraggableWalletList({
  wallets,
  balances,
  themeMode,
  onOrderChange,
  showLinks = true,
}: DraggableWalletListProps) {
  const [orderedWallets, setOrderedWallets] = useState<Wallet[]>(wallets);
  const positions = useSharedValue<number[]>(wallets.map((_, i) => i));

  useEffect(() => {
    setOrderedWallets(wallets);
    positions.value = wallets.map((_, i) => i);
  }, [wallets]);

  const handleDragEnd = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // Create new ordered array
    const newOrder = [...orderedWallets];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    setOrderedWallets(newOrder);

    // Update database with new order
    const orderUpdates = newOrder.map((wallet, index) => ({
      id: wallet.id!,
      display_order: index,
    }));

    try {
      await updateWalletsOrder(orderUpdates);
      onOrderChange?.();
    } catch (error) {
      console.error('Failed to update wallet order:', error);
      // Revert on error
      setOrderedWallets(wallets);
      positions.value = wallets.map((_, i) => i);
    }
  };

  if (orderedWallets.length === 0) {
    return null;
  }

  return (
    <View style={{ height: orderedWallets.length * CARD_HEIGHT, paddingTop: 4 }}>
        {orderedWallets.map((wallet, index) => (
          <DraggableWalletItem
            key={wallet.id}
            wallet={wallet}
            balance={balances[wallet.id!] ?? 0}
            themeMode={themeMode}
            index={index}
            positions={positions}
            onDragEnd={handleDragEnd}
            showLink={showLinks}
          />
        ))}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  draggableItem: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
