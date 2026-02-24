import { NextFunction, Request, Response } from 'express';
import { db } from '../db';

async function getMembership(walletId: string, userId: string): Promise<'owner' | 'member' | null> {
  const result = await db.query<{ role: 'owner' | 'member' }>(
    `SELECT role
     FROM wallet_members
     WHERE wallet_id = $1 AND user_id = $2
     LIMIT 1`,
    [walletId, userId]
  );

  return result.rows[0]?.role ?? null;
}

export async function requireWalletMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  const walletId = req.params.walletId;
  const userId = req.authUser?.id;

  if (!walletId || !userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const role = await getMembership(walletId, userId);
    if (!role) {
      res.status(403).json({ error: 'Wallet access denied' });
      return;
    }
    req.walletRole = role;
    next();
  } catch {
    res.status(500).json({ error: 'Failed to verify wallet membership' });
  }
}

export async function requireWalletOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const walletId = req.params.walletId;
  const userId = req.authUser?.id;

  if (!walletId || !userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const role = await getMembership(walletId, userId);
    if (role !== 'owner') {
      res.status(403).json({ error: 'Owner permission required' });
      return;
    }
    req.walletRole = role;
    next();
  } catch {
    res.status(500).json({ error: 'Failed to verify wallet owner permission' });
  }
}
