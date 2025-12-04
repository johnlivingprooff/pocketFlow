import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { Wallet } from '../types/wallet';
import { WalletCard } from './WalletCard';
import { updateWalletsOrder } from '../lib/db/wallets';

const CARD_HEIGHT = 100;
const ITEM_SPACING = 15;
const ITEM_HEIGHT = CARD_HEIGHT - ITEM_SPACING;

// Auto-scroll tuning
const AUTO_SCROLL_THRESHOLD = 80;
const AUTO_SCROLL_SPEED = 3;

interface Props {
  wallets: Wallet[];
  balances: Record<number, number>;
  themeMode: 'light' | 'dark' | 'system';
  onOrderChange?: () => void;
  showLinks?: boolean;
}

export function DraggableWalletList({
  wallets,
  balances,
  themeMode,
  onOrderChange,
  showLinks = true,
}: Props) {
  const [ordered, setOrdered] = useState(wallets);

  // Position array stores wallet IDs in order
  const positions = useSharedValue<number[]>(wallets.map((w) => w.id!));

  useEffect(() => {
    setOrdered(wallets);
    positions.value = wallets.map((w) => w.id!);
  }, [wallets]);

  const onDragEnd = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newOrdered = [...ordered];
    const [moved] = newOrdered.splice(fromIndex, 1);
    newOrdered.splice(toIndex, 0, moved);

    setOrdered(newOrdered);

    try {
      const updates = newOrdered.map((wallet, index) => ({
        id: wallet.id!,
        display_order: index,
      }));

      await updateWalletsOrder(updates);
      onOrderChange?.();
    } catch (e) {
      // revert on fail
      setOrdered(wallets);
      positions.value = wallets.map((w) => w.id!);
    }
  };

  const resolvedMode: 'light' | 'dark' =
    themeMode === 'system' ? 'light' : themeMode;

  return (
    <View style={{ paddingVertical: 10, minHeight: ordered.length * ITEM_HEIGHT }}>
      {ordered.map((wallet, index) => (
        <DraggableItem
          key={wallet.id}
          wallet={wallet}
          index={index}
          balance={balances[wallet.id!] ?? 0}
          themeMode={resolvedMode}
          positions={positions}
          showLink={showLinks}
          onDragEnd={onDragEnd}
        />
      ))}
    </View>
  );
}

interface ItemProps {
  wallet: Wallet;
  balance: number;
  themeMode: 'light' | 'dark';
  index: number;
  positions: any; // SharedValue<number[]> from react-native-reanimated
  showLink: boolean;
  onDragEnd: (from: number, to: number) => void;
}

function DraggableItem({
  wallet,
  balance,
  themeMode,
  index,
  positions,
  showLink,
  onDragEnd,
}: ItemProps) {
  const id = wallet.id!;
  const translateY = useSharedValue(index * ITEM_HEIGHT);
  const isDragging = useSharedValue(false);
  const dragOffset = useSharedValue(0);

  const longPress = Gesture.LongPress()
    .minDuration(220)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      dragOffset.value = translateY.value;
    })
    .onUpdate((e) => {
      const nextY = dragOffset.value + e.translationY;
      translateY.value = nextY;

      // --- Auto-scroll when near top/bottom ---
      const isNearTop = e.absoluteY < AUTO_SCROLL_THRESHOLD;
      const isNearBottom =
        e.absoluteY > ((e as any).viewportHeight ?? 800 - AUTO_SCROLL_THRESHOLD);

      if (isNearTop) translateY.value -= AUTO_SCROLL_SPEED;
      if (isNearBottom) translateY.value += AUTO_SCROLL_SPEED;

      // --- Compute new index ---
      const newIndex = Math.round(nextY / ITEM_HEIGHT);
      const clamped = Math.max(
        0,
        Math.min(positions.value.length - 1, newIndex)
      );

      const currentOrder = positions.value;
      const from = currentOrder.indexOf(id);
      const to = clamped;

      if (from !== to) {
        const copy = [...currentOrder];
        copy.splice(from, 1);
        copy.splice(to, 0, id);
        positions.value = copy;
      }
    })
    .onEnd(() => {
      isDragging.value = false;

      const finalIndex = positions.value.indexOf(id);
      const finalY = finalIndex * ITEM_HEIGHT;

      translateY.value = withSpring(finalY, {
        stiffness: 170,
        damping: 20,
      });

      runOnJS(onDragEnd)(index, finalIndex);
    });

  const gesture = Gesture.Simultaneous(longPress, pan);

  const animStyle = useAnimatedStyle(() => {
    const targetIndex = positions.value.indexOf(id);
    const targetY = targetIndex * ITEM_HEIGHT;

    const y = isDragging.value
      ? translateY.value
      : withSpring(targetY, {
          stiffness: 170,
          damping: 20,
        });

    return {
      transform: [{ translateY: y }],
      zIndex: isDragging.value ? 200 : 1,
      opacity: isDragging.value ? 0.96 : 1,
      scale: isDragging.value
        ? withSpring(1.02)
        : withSpring(1),
      shadowOpacity: isDragging.value ? 0.25 : 0.1,
      shadowRadius: isDragging.value ? 12 : 3,
    };
  });

  const card = (
    <View style={{ height: CARD_HEIGHT }}>
      <WalletCard
        name={wallet.name}
        balance={balance}
        currency={wallet.currency}
        color={wallet.color}
        mode={themeMode}
      />
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
        <Text style={{ fontSize: 13, color: '#666', fontWeight: '800' }}>
          ⋮⋮
        </Text>
      </View>
    </View>
  );

  const content = showLink ? (
    <Link href={`/wallets/${wallet.id}`} asChild>
      <TouchableOpacity activeOpacity={0.8}>{card}</TouchableOpacity>
    </Link>
  ) : (
    card
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.item, animStyle]}>{content}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    elevation: 4,
  },
});
