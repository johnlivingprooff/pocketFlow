// DraggableWalletList.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
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
const AUTO_SCROLL_AMOUNT = 10; // px per tick for scroll
const AUTO_SCROLL_THROTTLE_MS = 30; // limit scroll frequency

// Spring presets (iOS-like feel)
const SPRING_PRESET = {
  stiffness: 180,
  damping: 20,
};

// Types (adjust if you use TS types elsewhere)
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

  // Positions array (IDs in order)
  const positions = useSharedValue<number[]>(wallets.map((w) => w.id!));

  // Map of id -> translateY (populated by children on mount)
  const translateYMap = useRef<Record<number, Animated.SharedValue<number>>>({});

  // ScrollView reference + scroll position
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffsetRef = useRef(0);
  const lastAutoScrollAt = useRef<number>(0);

  // When wallets prop changes, update local ordered + positions and ensure translateY map entries exist
  useEffect(() => {
    setOrdered(wallets);
    positions.value = wallets.map((w) => w.id!);

    // If children have registered translateY, realign them
    wallets.forEach((w, idx) => {
      const entry = translateYMap.current[w.id!];
      if (entry) entry.value = idx * ITEM_HEIGHT;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets]);

  // Register/unregister functions passed to items
  const registerTranslate = useCallback((id: number, shared: Animated.SharedValue<number>) => {
    translateYMap.current[id] = shared;
  }, []);

  const unregisterTranslate = useCallback((id: number) => {
    delete translateYMap.current[id];
  }, []);

  // Helper to auto-scroll: called from JS via runOnJS from worklets
  const doAutoScroll = useCallback((direction: 'up' | 'down') => {
    const now = Date.now();
    if (now - lastAutoScrollAt.current < AUTO_SCROLL_THROTTLE_MS) return;
    lastAutoScrollAt.current = now;

    const scroller = scrollRef.current;
    if (!scroller) return;

    const newOffset =
      direction === 'up' ? Math.max(0, scrollOffsetRef.current - AUTO_SCROLL_AMOUNT)
        : scrollOffsetRef.current + AUTO_SCROLL_AMOUNT;

    scroller.scrollTo({ y: newOffset, animated: false });
    scrollOffsetRef.current = newOffset;
  }, []);

  // onDragEnd: update order in-memory and persist, then realign translateY map
  const onDragEnd = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      const newOrdered = [...ordered];
      const [moved] = newOrdered.splice(fromIndex, 1);
      newOrdered.splice(toIndex, 0, moved);

      setOrdered(newOrdered);
      positions.value = newOrdered.map((w) => w.id!);

      // Realign all registered translateY to new indices to avoid jumps
      positions.value.forEach((id, idx) => {
        const tv = translateYMap.current[id];
        if (tv) tv.value = idx * ITEM_HEIGHT;
      });

      try {
        const updates = newOrdered.map((wallet, index) => ({
          id: wallet.id!,
          display_order: index,
        }));
        await updateWalletsOrder(updates);
        onOrderChange?.();
      } catch (e) {
        // rollback on failure
        setOrdered(wallets);
        positions.value = wallets.map((w) => w.id!);
        wallets.forEach((w, index) => {
          const tv = translateYMap.current[w.id!];
          if (tv) tv.value = index * ITEM_HEIGHT;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordered, wallets, onOrderChange]
  );

  const resolvedMode: 'light' | 'dark' = themeMode === 'system' ? 'light' : themeMode;

  const items = useMemo(
    () =>
      ordered.map((wallet, index) => (
        <DraggableItem
          key={wallet.id}
          wallet={wallet}
          index={index}
          balance={balances[wallet.id!] ?? 0}
          themeMode={resolvedMode}
          positions={positions}
          registerTranslate={registerTranslate}
          unregisterTranslate={unregisterTranslate}
          showLink={showLinks}
          onDragEnd={onDragEnd}
          runAutoScroll={(dir: 'up' | 'down') => runOnJS(doAutoScroll)(dir)}
        />
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordered, balances, resolvedMode, positions, showLinks, onDragEnd, registerTranslate, unregisterTranslate]
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  };

  return (
    <View
      style={{
        paddingVertical: 10,
        minHeight: ordered.length * ITEM_HEIGHT,
      }}
    >
      {items}
    </View>
  );
}

/* ---------------------------
   DraggableItem component
   - creates its own useSharedValue at top-level (valid Hook usage)
   - registers translateY with parent on mount
   - uses handle long-press to start drag (drag-handle only)
   - uses parent-runAutoScroll (runOnJS) to scroll the list when near edges
----------------------------*/
interface ItemProps {
  wallet: Wallet;
  balance: number;
  themeMode: 'light' | 'dark';
  index: number;
  positions: Animated.SharedValue<number[]>;
  registerTranslate: (id: number, v: Animated.SharedValue<number>) => void;
  unregisterTranslate: (id: number) => void;
  showLink: boolean;
  onDragEnd: (from: number, to: number) => void;
  runAutoScroll: (dir: 'up' | 'down') => void;
}

function DraggableItem({
  wallet,
  balance,
  themeMode,
  index,
  positions,
  registerTranslate,
  unregisterTranslate,
  showLink,
  onDragEnd,
  runAutoScroll,
}: ItemProps) {
  const id = wallet.id!;
  // create translateY at top-level (Hook)
  const translateY = useSharedValue(index * ITEM_HEIGHT);
  const isDragging = useSharedValue(false);
  const dragOffset = useSharedValue(0);
  const dragStartIndex = useSharedValue(index);

  // Register with parent (so parent can realign values). This is safe — registerTranslate is a normal function.
  useEffect(() => {
    registerTranslate(id, translateY);
    return () => {
      unregisterTranslate(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle long press on the handle only
  const handleLong = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      // Begin dragging when long press on handle occurs
      isDragging.value = true;
      dragStartIndex.value = positions.value.indexOf(id);
      // small immediate feedback
      runOnJS(Haptics.impactAsync)('light');
    });

  // Pan gesture: works only once handleLong has set isDragging (we use Simultaneous so both can combine)
  const pan = Gesture.Pan()
    .onStart(() => {
      // only start pan if handle long-press set dragging
      if (!isDragging.value) return;
      dragOffset.value = translateY.value;
    })
    .onUpdate((e) => {
      if (!isDragging.value) return;

      // Move the card by finger
      const nextY = dragOffset.value + e.translationY;
      translateY.value = nextY;

      // Auto-scroll when near top or bottom of container (call parent via runOnJS)
      if (e.absoluteY < AUTO_SCROLL_THRESHOLD) {
        runOnJS(runAutoScroll)('up');
      } else if (e.absoluteY > e.containerHeight - AUTO_SCROLL_THRESHOLD) {
        runOnJS(runAutoScroll)('down');
      }

      // Compute new index and shuffle positions if needed
      const newIndex = Math.round(nextY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(positions.value.length - 1, newIndex));

      const currentOrder = positions.value;
      const from = currentOrder.indexOf(id);
      const to = clamped;

      if (from !== to) {
        // swap in positions
        const copy = [...currentOrder];
        copy.splice(from, 1);
        copy.splice(to, 0, id);
        positions.value = copy;

        // Haptic + optional scale feedback using runOnJS
        runOnJS(Haptics.selectionAsync)();
      }
    })
    .onEnd(() => {
      if (!isDragging.value) return;
      isDragging.value = false;

      const finalIndex = positions.value.indexOf(id);
      const finalY = finalIndex * ITEM_HEIGHT;

      translateY.value = withSpring(finalY, SPRING_PRESET);

      runOnJS(onDragEnd)(dragStartIndex.value, finalIndex);
      runOnJS(Haptics.impactAsync)('medium');
    })
    .onFinalize(() => {
      isDragging.value = false;
    });

  // We require the long-press on the handle, so use simultaneous for those two (the long-press is attached to handle only)
  // The pan will be global but will only move after isDragging is set by long-press
  const gesture = Gesture.Simultaneous(handleLong, pan);

  // animated style: if dragging, use direct translateY; otherwise spring to its slot
  const animStyle = useAnimatedStyle(() => {
    const targetIndex = positions.value.indexOf(id);
    const targetY = targetIndex * ITEM_HEIGHT;

    return {
      transform: [
        {
          translateY: isDragging.value
            ? translateY.value
            : withSpring(targetY, SPRING_PRESET),
        },
      ],
      zIndex: isDragging.value ? 100 : 1,
      opacity: isDragging.value ? 0.97 : 1,
      scale: isDragging.value ? withSpring(1.02, { stiffness: 200, damping: 18 }) : withSpring(1),
      shadowOpacity: isDragging.value ? 0.25 : 0.1,
      shadowRadius: isDragging.value ? 12 : 3,
    };
  });

  const card = (
    <View style={{ height: CARD_HEIGHT, position: 'relative' }}>
      <WalletCard
        name={wallet.name}
        balance={balance}
        currency={wallet.currency}
        color={wallet.color}
        mode={themeMode}
      />
      {/* Drag handle: only this area activates gestures */}
      <GestureDetector gesture={gesture}>
        <View style={styles.handle}>
          <Text style={styles.handleDots}>⋮⋮</Text>
        </View>
      </GestureDetector>
    </View>
  );

  const content = showLink ? (
    <Link href={`/wallets/${wallet.id}`} asChild>
      <TouchableOpacity activeOpacity={0.8}>
        {card}
      </TouchableOpacity>
    </Link>
  ) : (
    card
  );

  return (
    <Animated.View style={[styles.item, animStyle]}>
      {content}
    </Animated.View>
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
  handle: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  handleDots: {
    fontSize: 13,
    color: '#666',
    fontWeight: '800',
  },
});
