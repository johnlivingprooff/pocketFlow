import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Link } from 'expo-router';
import { Wallet } from '../types/wallet';
import { WalletCard } from './WalletCard';
import { updateWalletsOrder } from '../lib/db/wallets';

const CARD_HEIGHT = 100; // Compact card height
const ITEM_SPACING = 15; // Minimal spacing between cards
const ITEM_HEIGHT = CARD_HEIGHT - ITEM_SPACING; // Total vertical step per item

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

  const longPressGesture = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      startY.value = translateY.value;
      startIndex.value = index;
      isDragging.value = true;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isDragging.value) return;
      translateY.value = startY.value + event.translationY;

      // Calculate new position based on drag using ITEM_HEIGHT
      const newIndex = Math.round((startIndex.value * ITEM_HEIGHT + translateY.value) / ITEM_HEIGHT);
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
      if (!isDragging.value) return;
      
      // Calculate final position
      const newIndex = Math.round((startIndex.value * ITEM_HEIGHT + translateY.value) / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(positions.value.length - 1, newIndex));

      // Keep the card at the drop position, then turn off dragging
      isDragging.value = false;
      translateY.value = 0;

      // Notify parent of order change
      if (clampedIndex !== startIndex.value) {
        runOnJS(onDragEnd)(startIndex.value, clampedIndex);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Find where this item should be positioned
    const targetIndex = positions.value.indexOf(index);
    const targetY = targetIndex * ITEM_HEIGHT;

    return {
      top: isDragging.value
        ? targetY + translateY.value
        : withTiming(targetY, { duration: 200 }),
      zIndex: isDragging.value ? 100 : 1,
      opacity: isDragging.value ? 0.98 : 1,
    };
  });

  // Resolve themeMode to 'light' or 'dark'
  const resolvedMode: 'light' | 'dark' = themeMode === 'system' ? 'light' : themeMode;

  const cardContent = (
    <View style={{ height: CARD_HEIGHT }}>
      <WalletCard
        name={wallet.name}
        balance={balance}
        currency={wallet.currency}
        color={wallet.color}
        mode={resolvedMode}
      />
      {/* Drag Handle */}
      <View
        style={{
          position: 'absolute',
          right: 10,
          top: 10,
          backgroundColor: 'rgba(0,0,0,0.06)',
          borderRadius: 10,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}
      >
        <Text style={{ color: '#666', fontSize: 13, fontWeight: '800' }}>⋮⋮</Text>
      </View>
    </View>
  );

  const dragGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  if (showLink) {
    return (
      <GestureDetector gesture={dragGesture}>
        <Animated.View style={[styles.draggableItem, animatedStyle]}>
          <Link href={`/wallets/${wallet.id}`} asChild>
            <TouchableOpacity activeOpacity={0.8}>{cardContent}</TouchableOpacity>
          </Link>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View style={[styles.draggableItem, animatedStyle]}>{cardContent}</Animated.View>
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

  // Calculate container height based on item count and spacing
  const containerMinHeight = orderedWallets.length * ITEM_HEIGHT - ITEM_SPACING + 12; // slight bottom pad

  return (
    <View style={{ minHeight: containerMinHeight, paddingTop: 6, paddingBottom: 12 }}>
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
