import { Request, Response, Router } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

type ProfileRow = {
  user_id: string;
  wallets: unknown;
  categories: unknown;
  settings: unknown;
  updated_at: string;
};

const MAX_WALLETS = 100;
const MAX_CATEGORIES = 500;
const MAX_SETTINGS_KEYS = 64;

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await db.query<ProfileRow>(
      `SELECT user_id, wallets, categories, settings, updated_at
       FROM user_profiles
       WHERE user_id = $1;`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      res.json({ profile: null });
      return;
    }

    res.json({
      profile: {
        wallets: row.wallets,
        categories: row.categories,
        settings: row.settings,
        updatedAt: row.updated_at,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  if (!Array.isArray(body.wallets) || body.wallets.length > MAX_WALLETS) {
    res.status(400).json({ error: `wallets must be an array (max ${MAX_WALLETS} items)` });
    return;
  }
  if (!Array.isArray(body.categories) || body.categories.length > MAX_CATEGORIES) {
    res.status(400).json({ error: `categories must be an array (max ${MAX_CATEGORIES} items)` });
    return;
  }
  if (
    typeof body.settings !== 'object' ||
    body.settings === null ||
    Array.isArray(body.settings) ||
    Object.keys(body.settings).length > MAX_SETTINGS_KEYS
  ) {
    res.status(400).json({ error: `settings must be an object (max ${MAX_SETTINGS_KEYS} keys)` });
    return;
  }

  try {
    await db.query(
      `INSERT INTO user_profiles (user_id, wallets, categories, settings)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET
         wallets = EXCLUDED.wallets,
         categories = EXCLUDED.categories,
         settings = EXCLUDED.settings;`,
      [userId, JSON.stringify(body.wallets), JSON.stringify(body.categories), JSON.stringify(body.settings)]
    );

    res.json({ updatedAt: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;