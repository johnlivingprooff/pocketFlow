import { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { Wallet } from '../../types/wallet';
import { getWallets, getWalletBalances } from '../db/wallets';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ws = await getWallets();
      const walletIds = ws.map((w) => w.id).filter((id): id is number => id !== undefined);
      // Use the batch query instead of N+1 individual balance queries.
      const b = await getWalletBalances(walletIds);
      if (!mountedRef.current) return;
      setWallets(ws);
      setBalances(b);
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWallets();
    }, [loadWallets])
  );

  return { wallets, balances, loading, error, refresh: loadWallets };
}
