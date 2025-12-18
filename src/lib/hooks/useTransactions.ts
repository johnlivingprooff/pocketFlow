import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Transaction } from '../../types/transaction';
import { getTransactions } from '../db/transactions';

export function useTransactions(page = 0, pageSize = 20) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    if (Platform.OS === 'web') {
      // Skip Nitro SQLite-backed calls on web; return empty data
      setTransactions([]);
      setLoading(false);
      return;
    }
    const ts = await getTransactions(page, pageSize);
    setTransactions(ts);
    setLoading(false);
  }, [page, pageSize]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  return { transactions, loading };
}
