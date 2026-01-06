import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Wallet } from '../../types/wallet';
import { getWallets, getWalletBalances } from '../db/wallets';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    const ws = await getWallets();
    setWallets(ws);
    
    // Use optimized batch query instead of N+1 individual queries
    const walletIds = ws.map(w => w.id!).filter(id => id !== undefined);
    const b = await getWalletBalances(walletIds);
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
