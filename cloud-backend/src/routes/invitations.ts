import { Request, Response, Router } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

type InvitationRow = {
  id: string;
  wallet_id: string;
  accepted_at: string | null;
  expires_at: string;
};

router.post('/accept', requireAuth, async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!token) {
    res.status(400).json({ error: 'Invitation token is required' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const inviteResult = await client.query<InvitationRow>(
      `SELECT id, wallet_id, accepted_at, expires_at::TEXT
       FROM wallet_invitations
       WHERE token = $1
       LIMIT 1`,
      [token]
    );

    const invite = inviteResult.rows[0];
    if (!invite) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    if (invite.accepted_at) {
      await client.query('ROLLBACK');
      res.status(410).json({ error: 'Invitation already used' });
      return;
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      res.status(410).json({ error: 'Invitation expired' });
      return;
    }

    await client.query(
      `INSERT INTO wallet_members (wallet_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (wallet_id, user_id) DO NOTHING`,
      [invite.wallet_id, userId]
    );

    await client.query('UPDATE wallet_invitations SET accepted_at = NOW() WHERE id = $1', [invite.id]);
    await client.query('COMMIT');

    res.status(200).json({ status: 'accepted', walletId: invite.wallet_id });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to accept invitation' });
  } finally {
    client.release();
  }
});

export default router;
