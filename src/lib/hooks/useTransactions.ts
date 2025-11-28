import { useEffect, useState } from 'react';
import { Transaction } from '../../types/transaction';
import { getTransactions } from '../db/transactions';

export function useTransactions(page = 0, pageSize = 20) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ts = await getTransactions(page, pageSize);
      setTransactions(ts);
      setLoading(false);
    })();
  }, [page, pageSize]);

  return { transactions, loading };
}
