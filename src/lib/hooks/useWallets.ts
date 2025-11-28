import { useEffect, useState } from 'react';
import { Wallet } from '../../types/wallet';
import { getWallets, getWalletBalance } from '../db/wallets';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ws = await getWallets();
      setWallets(ws);
      const b: Record<number, number> = {};
      for (const w of ws) {
        if (w.id) b[w.id] = await getWalletBalance(w.id);
      }
      setBalances(b);
      setLoading(false);
    })();
  }, []);

  return { wallets, balances, loading };
}
