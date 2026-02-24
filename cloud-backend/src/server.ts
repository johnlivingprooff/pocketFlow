import cors from 'cors';
import express, { Request, Response } from 'express';
import { config } from './config';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallets';
import invitationRoutes from './routes/invitations';

const app = express();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInviteFallbackPage(params: {
  token: string;
  deepLink: string;
  androidPlayStoreUrl?: string;
  iosAppStoreUrl?: string;
}): string {
  const escapedToken = escapeHtml(params.token);
  const escapedDeepLink = escapeHtml(params.deepLink);
  const escapedAndroidStoreUrl = escapeHtml(params.androidPlayStoreUrl || '');
  const escapedIosStoreUrl = escapeHtml(params.iosAppStoreUrl || '');

  const storeButtons = [
    escapedAndroidStoreUrl
      ? `<a class="button secondary" href="${escapedAndroidStoreUrl}">Get it on Android</a>`
      : '',
    escapedIosStoreUrl
      ? `<a class="button secondary" href="${escapedIosStoreUrl}">Get it on iPhone</a>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Open pocketFlow Invitation</title>
    <style>
      :root {
        --bg: #f6f8f7;
        --card: #ffffff;
        --text: #102a2f;
        --muted: #5b7074;
        --accent: #0b6b61;
        --accent-2: #e8f3f1;
        --border: #d9e3e1;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0d1d20;
          --card: #11282d;
          --text: #eaf6f4;
          --muted: #a2b8bc;
          --accent: #5ac2b4;
          --accent-2: #19383d;
          --border: #2f4b50;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      .card {
        width: min(520px, 100%);
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
      }
      h1 { margin: 0 0 8px; font-size: 22px; line-height: 1.2; }
      p { margin: 0; color: var(--muted); line-height: 1.45; }
      .token {
        margin-top: 12px;
        padding: 10px 12px;
        border: 1px dashed var(--border);
        border-radius: 10px;
        font-family: ui-monospace, Menlo, Consolas, monospace;
        color: var(--muted);
        word-break: break-all;
      }
      .actions {
        margin-top: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        border-radius: 10px;
        padding: 0 14px;
        text-decoration: none;
        font-weight: 700;
        border: 1px solid transparent;
      }
      .button.primary {
        background: var(--accent);
        color: #fff;
      }
      .button.secondary {
        background: var(--accent-2);
        color: var(--text);
        border-color: var(--border);
      }
      .hint {
        margin-top: 14px;
        font-size: 13px;
        color: var(--muted);
      }
      .loading {
        margin-top: 12px;
        font-size: 14px;
        color: var(--muted);
      }
      .loading.hidden { display: none; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Opening your shared wallet invite...</h1>
      <p>If pocketFlow is installed, this link should open the app automatically.</p>
      <div class="token">Invite token: ${escapedToken}</div>
      <p id="loading" class="loading">Trying to open the app now.</p>
      <div class="actions">
        <a class="button primary" href="${escapedDeepLink}">Open in pocketFlow</a>
        ${storeButtons}
      </div>
      <p class="hint">
        If nothing happens, tap <strong>Open in pocketFlow</strong>. Keep this page open until the app finishes loading.
      </p>
    </main>

    <script>
      (function () {
        var deepLink = ${JSON.stringify(params.deepLink)};
        var loadingEl = document.getElementById('loading');
        try {
          window.location.href = deepLink;
        } catch (err) {
          // no-op
        }
        window.setTimeout(function () {
          if (loadingEl) {
            loadingEl.className = 'loading hidden';
          }
        }, 1600);
      })();
    </script>
  </body>
</html>`;
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/invite/:token', (req: Request, res: Response) => {
  const token = String(req.params.token || '').trim();
  if (!token) {
    res.status(400).json({ error: 'Invitation token is required' });
    return;
  }

  const normalizedScheme = config.APP_DEEP_LINK_SCHEME.replace('://', '').replace(':', '');
  const deepLink = `${normalizedScheme}://invite/${encodeURIComponent(token)}`;
  res
    .status(200)
    .set('Content-Type', 'text/html; charset=utf-8')
    .set('Cache-Control', 'no-store')
    .send(
      renderInviteFallbackPage({
        token,
        deepLink,
        androidPlayStoreUrl: config.ANDROID_PLAY_STORE_URL,
        iosAppStoreUrl: config.IOS_APP_STORE_URL,
      })
    );
});

app.use('/auth', authRoutes);
app.use('/wallets', walletRoutes);
app.use('/invitations', invitationRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.PORT, () => {
  console.log(`[cloud-backend] listening on port ${config.PORT}`);
});
