import { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { Transaction } from '../../types/transaction';
import { getTransactions } from '../db/transactions';

export function useTransactions(page = 0, pageSize = 20) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ts = await getTransactions(page, pageSize);
      if (!mountedRef.current) return;
      setTransactions(ts);
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, pageSize]);

  useFocusEffect(
    useCallback(() => {
      void loadTransactions();
    }, [loadTransactions])
  );

  return { transactions, loading, error, refresh: loadTransactions };
}
