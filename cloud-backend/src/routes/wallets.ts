import { Request, Response, Router } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireWalletMember, requireWalletOwner } from '../middleware/permissions';
import { config } from '../config';
import { generateRandomToken, generateShareId } from '../utils/crypto';

const router = Router();

type WalletRow = {
  id: string;
  name: string;
  share_id: string | null;
  role: 'owner' | 'member';
  member_count: string | number;
};

type MemberRow = {
  user_id: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
};

type SyncTransaction = {
  externalId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string | null;
  date: string;
  notes: string | null;
  updatedAt: string;
};

function toWalletSummary(row: WalletRow) {
  return {
    id: row.id,
    name: row.name,
    shareId: row.share_id,
    role: row.role,
    memberCount: Number(row.member_count) || 0,
    syncStatus: 'synced' as const,
  };
}

router.use(requireAuth);

router.get('/shared', async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await db.query<WalletRow>(
      `SELECT w.id,
              w.name,
              w.share_id,
              wm.role,
              (SELECT COUNT(*) FROM wallet_members wm_count WHERE wm_count.wallet_id = w.id) AS member_count
       FROM wallet_members wm
       JOIN wallets w ON w.id = wm.wallet_id
       WHERE wm.user_id = $1
         AND w.is_shared = TRUE
       ORDER BY w.created_at DESC`,
      [userId]
    );

    res.json({ wallets: result.rows.map(toWalletSummary) });
  } catch {
    res.status(500).json({ error: 'Failed to list shared wallets' });
  }
});

router.post('/share', async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'Wallet name is required' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const shareId = generateShareId();

    const walletResult = await client.query<{ id: string; name: string; share_id: string | null }>(
      `INSERT INTO wallets (name, created_by, is_shared, share_id)
       VALUES ($1, $2, TRUE, $3)
       RETURNING id, name, share_id`,
      [name, userId, shareId]
    );

    const wallet = walletResult.rows[0];

    await client.query(
      `INSERT INTO wallet_members (wallet_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [wallet.id, userId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      wallet: {
        id: wallet.id,
        name: wallet.name,
        shareId: wallet.share_id,
        role: 'owner',
        memberCount: 1,
        syncStatus: 'synced',
      },
    });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to enable shared wallet' });
  } finally {
    client.release();
  }
});

router.get('/:walletId', requireWalletMember, async (req: Request, res: Response) => {
  const walletId = req.params.walletId;
  const role = req.walletRole;

  try {
    const result = await db.query<WalletRow>(
      `SELECT w.id,
              w.name,
              w.share_id,
              wm.role,
              (SELECT COUNT(*) FROM wallet_members wm_count WHERE wm_count.wallet_id = w.id) AS member_count
       FROM wallets w
       JOIN wallet_members wm ON wm.wallet_id = w.id
       WHERE w.id = $1
         AND wm.user_id = $2
       LIMIT 1`,
      [walletId, req.authUser?.id]
    );

    const wallet = result.rows[0];
    if (!wallet) {
      res.status(404).json({ error: 'Shared wallet not found' });
      return;
    }

    res.json({ wallet: { ...toWalletSummary(wallet), role: role || wallet.role } });
  } catch {
    res.status(500).json({ error: 'Failed to load shared wallet' });
  }
});

router.patch('/:walletId/share/disable', requireWalletOwner, async (req: Request, res: Response) => {
  const walletId = req.params.walletId;
  const ownerId = req.authUser?.id;
  if (!ownerId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE wallets
       SET is_shared = FALSE,
           share_id = NULL
       WHERE id = $1`,
      [walletId]
    );

    await client.query(
      `DELETE FROM wallet_members
       WHERE wallet_id = $1
         AND user_id <> $2`,
      [walletId, ownerId]
    );

    await client.query('COMMIT');
    res.status(204).send();
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to disable wallet sharing' });
  } finally {
    client.release();
  }
});

router.get('/:walletId/members', requireWalletMember, async (req: Request, res: Response) => {
  const walletId = req.params.walletId;

  try {
    const result = await db.query<MemberRow>(
      `SELECT wm.user_id,
              u.email,
              wm.role,
              wm.joined_at::TEXT
       FROM wallet_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.wallet_id = $1
       ORDER BY CASE WHEN wm.role = 'owner' THEN 0 ELSE 1 END, wm.joined_at ASC`,
      [walletId]
    );

    res.json({
      members: result.rows.map((row: MemberRow) => ({
        userId: row.user_id,
        email: row.email,
        role: row.role,
        joinedAt: row.joined_at,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch wallet members' });
  }
});

router.post('/:walletId/invitations', requireWalletOwner, async (req: Request, res: Response) => {
  const walletId = req.params.walletId;
  const invitedBy = req.authUser?.id;

  if (!invitedBy) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = generateRandomToken(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    const created = await db.query<{ id: string }>(
      `INSERT INTO wallet_invitations (wallet_id, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [walletId, invitedBy, token, expiresAt.toISOString()]
    );

    res.status(201).json({
      invitationId: created.rows[0].id,
      token,
      inviteLink: `${config.INVITATION_BASE_URL.replace(/\/$/, '')}/invite/${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

router.delete('/:walletId/members/:memberUserId', requireWalletOwner, async (req: Request, res: Response) => {
  const walletId = req.params.walletId;
  const memberUserId = req.params.memberUserId;

  try {
    const ownerCheck = await db.query<{ role: 'owner' | 'member' }>(
      `SELECT role
       FROM wallet_members
       WHERE wallet_id = $1 AND user_id = $2
       LIMIT 1`,
      [walletId, memberUserId]
    );

    if (ownerCheck.rows[0]?.role === 'owner') {
      res.status(400).json({ error: 'Cannot remove wallet owner' });
      return;
    }

    await db.query(
      `DELETE FROM wallet_members
       WHERE wallet_id = $1 AND user_id = $2`,
      [walletId, memberUserId]
    );
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to remove wallet member' });
  }
});

router.post('/:walletId/transactions/sync', requireWalletMember, async (req: Request, res: Response) => {
  const walletId = req.params.walletId;
  const createdBy = req.authUser?.id;

  if (!createdBy) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const transactions: SyncTransaction[] = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
  if (transactions.length === 0) {
    res.status(200).json({ status: 'noop' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    for (const tx of transactions) {
      await client.query(
        `INSERT INTO shared_transactions
          (wallet_id, external_id, type, amount, category, date, notes, updated_at, created_by)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (wallet_id, external_id)
         DO UPDATE SET
           type = EXCLUDED.type,
           amount = EXCLUDED.amount,
           category = EXCLUDED.category,
           date = EXCLUDED.date,
           notes = EXCLUDED.notes,
           updated_at = EXCLUDED.updated_at,
           created_by = EXCLUDED.created_by
         WHERE shared_transactions.updated_at <= EXCLUDED.updated_at`,
        [
          walletId,
          tx.externalId,
          tx.type,
          tx.amount,
          tx.category,
          tx.date,
          tx.notes,
          tx.updatedAt,
          createdBy,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ status: 'ok' });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to sync transactions' });
  } finally {
    client.release();
  }
});

export default router;
