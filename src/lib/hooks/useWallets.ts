import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Wallet } from '../../types/wallet';
import { getWallets, getWalletBalance } from '../db/wallets';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    if (Platform.OS === 'web') {
      // Skip SQLite on web; return empty data gracefully
      setWallets([]);
      setBalances({});
      setLoading(false);
      return;
    }
    const ws = await getWallets();
    setWallets(ws);
    const b: Record<number, number> = {};
    for (const w of ws) {
      if (w.id) b[w.id] = await getWalletBalance(w.id);
    }
    setBalances(b);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWallets();
    }, [loadWallets])
  );

    return { wallets, balances, loading, refresh: loadWallets };
}
