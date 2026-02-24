import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db';
import { config } from '../config';
import { generateRandomToken, sha256 } from '../utils/crypto';
import { requireAuth } from '../middleware/auth';

const router = Router();

const authPayloadSchema = z.object({
  email: z.string().email().transform((value: string) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

function issueAccessToken(user: { id: string; email: string }): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    config.JWT_SECRET as jwt.Secret,
    { expiresIn: config.JWT_ACCESS_TOKEN_EXPIRES_SECONDS }
  );
}

async function issueRefreshToken(userId: string): Promise<string> {
  const refreshToken = generateRandomToken(48);
  const tokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()]
  );

  return refreshToken;
}

async function buildAuthResponse(user: { id: string; email: string }) {
  const accessToken = issueAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      accountStatus: 'active' as const,
    },
    accessToken,
    refreshToken,
    accessTokenExpiresInSeconds: 15 * 60,
  };
}

router.post('/register', async (req: Request, res: Response) => {
  const parsed = authPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration payload' });
    return;
  }

  try {
    const existing = await db.query<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [parsed.data.email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const created = await db.query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [parsed.data.email, passwordHash]
    );

    const user = created.rows[0];
    const response = await buildAuthResponse(user);
    res.status(201).json(response);
  } catch {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = authPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid login payload' });
    return;
  }

  try {
    const userResult = await db.query<{ id: string; email: string; password_hash: string }>(
      `SELECT id, email, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [parsed.data.email]
    );

    const user = userResult.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const response = await buildAuthResponse({ id: user.id, email: user.email });
    res.json(response);
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const tokenSchema = z.object({ refreshToken: z.string().min(1) });
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  const tokenHash = sha256(parsed.data.refreshToken);

  try {
    const tokenResult = await db.query<{ user_id: string; email: string }>(
      `SELECT rt.user_id, u.email
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);

    const response = await buildAuthResponse({ id: tokenRow.user_id, email: tokenRow.email });
    res.json(response);
  } catch {
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const tokenSchema = z.object({ refreshToken: z.string().optional() });
  const parsed = tokenSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(204).send();
    return;
  }

  const refreshToken = parsed.data.refreshToken;
  if (refreshToken) {
    const tokenHash = sha256(refreshToken);
    try {
      await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
    } catch {
      // no-op
    }
  }

  res.status(204).send();
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await db.query<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        accountStatus: 'active',
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch account profile' });
  }
});

router.delete('/account', requireAuth, async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
