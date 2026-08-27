# pocketFlow Web — Shared Wallets Dashboard

Separate liquid-glass finance dashboard for **shared wallets only**. Host on Vercel. App-only features (personal wallets, budgets, goals, analytics, receipts, SMS) remain on Android/iOS.

## Stack

- Next.js 14 App Router (port 3001) + Tailwind 3.4
- SVG icons (`components/icons.tsx`) — no emojis
- Glass: `bg-white/70 backdrop-blur-xl border border-white/50`
- Cloud backend `https://cloud.pf.eiteone.org` (`NEXT_PUBLIC_CLOUD_API_BASE_URL`)

## Run

```bash
cd web
npm install
NEXT_PUBLIC_CLOUD_API_BASE_URL=https://cloud.pf.eiteone.org npm run dev
# http://localhost:3001
```

Build: `npm run build` → `.next` (Vercel).

## Vercel

- Root directory: `web`
- Build: `next build`
- Env: `NEXT_PUBLIC_CLOUD_API_BASE_URL`
- The `webpage/` folder is the marketing site — keep as separate Vercel project.

## Auth

Mandatory for shared wallets. Tokens stored in `localStorage` (`pf_access`, `pf_refresh`, `pf_user`). All wallet/tx calls use `Authorization: Bearer`.

## Routes

- `/` — dashboard (wallets grid, stats, create)
- `/login` — register / login
- `/wallets/[id]` — detail, transactions, members, invite, add/delete tx
- `/invite/[token]` — accept invite
