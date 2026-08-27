# Web Strategy — Shared-Wallets-only Vercel Deployment

**Goal:** Ship a web version of pocketFlow that can be hosted on Vercel, where **only shared wallets** can be viewed and altered. All other features (personal wallets, analytics, budgets, goals, categories, receipts, SMS auto-log, biometrics, backups) stay **app-only** on Android/iOS. Creating or joining a shared wallet **requires a cloud account** on both platforms; on the web it is a hard gate.

---

## 1. Decision: Why Expo Web (static export) on Vercel

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A – Expo Web static export (`expo export --platform web`) hosted on Vercel** | Single codebase, reuses all wallet/tx UI, theme, hooks, `WebShell` + IndexedDB fallback already exists. Deploy in <5 min. No duplication, no auth drift. | SPA SEO not SSR, IndexedDB is per-browser. | **Chosen – most workable** |
| B – New Next.js `/app` inside `webpage/` | SSR, better SEO, clean separation | Duplicates wallet/tx logic, two UX to maintain, needs its own auth/session layer | Documented as future migration path |

> A can later be migrated to B without changing the backend contract (same `/v1/*` API).

---

## 2. Architecture

```
                ┌─────────────────────┐
                │  pocketFlow Mobile   │  Offline-first SQLite (expo-sqlite + nitro)
                │  Android / iOS       │  + Cloud sync for shared wallets only
                └─────────┬───────────┘
                          │  JWT (Bearer)  /v1/auth, /v1/wallets, /v1/invitations
                          ▼
┌──────────────────┐   ┌──────────────────────┐   ┌─────────────────┐
│  Vercel – Expo   │──▶│  cloud-backend       │──▶│  Postgres       │
│  Web (dist/)     │   │  Express + pg        │   │  users, wallets │
│  shared-only     │◀──│  CORS: Vercel origin │◀──│  members, tx    │
└──────────────────┘   └──────────────────────┘   └─────────────────┘
        │ IndexedDB (sql.js) per browser – mirrors shared wallets locally
        │ Cloud is source of truth for shared wallets on web
```

- **Personal wallets**: never hit the cloud. Stay in device SQLite. On web they are filtered out (`src/lib/platform/webGuards.ts`).
- **Shared wallets**: created via `POST /v1/wallets/share` (requires `Authorization`). Member list, invites, and `shared_transactions` live in Postgres and are replicated to members via the sync endpoints. Web reads them with `GET /v1/wallets/shared` and `GET /v1/wallets/:id/transactions`.

---

## 3. Mandatory Account Enforcement

- **Backend**: all `/v1/wallets/*` and `/v1/invitations/*` are behind `requireAuth` (`src/middleware/auth.ts:18`). `POST /v1/wallets/share` returns 401 without a valid JWT.
- **App**: `app/wallets/[id].tsx:162` and `app/settings/shared-wallets*` check `cloudSessionState !== 'authenticated'` and redirect to `/profile`.
- **Web**: same check becomes a **blocking wall** (`AppOnlyBlock` / `WebAuthWall`). On web `app/wallets/create.tsx` short-circuits to a sign-in CTA and never calls `createWallet` for a personal wallet; instead it calls `enableWalletSharing` which is 401-trapped without auth. `app/transactions/add.tsx` and `app/(tabs)/wallets.tsx` also block unauthenticated writes and filter `is_shared`.

Result: no anonymous shared wallet can be created on either surface, and web cannot be used without an account.

---

## 4. What Is Allowed vs Blocked on the Web

| Feature | Mobile | Web (Vercel) | Implementation |
|---|---|---|---|
| Sign up / Sign in / Sign out / Delete account | ✅ | ✅ (hard required) | `src/lib/services/cloud/authService.ts`, `app/profile/index.tsx` |
| List shared wallets | ✅ | ✅ | `listSharedWallets()` → `GET /v1/wallets/shared` |
| Create shared wallet | ✅ (share toggle in wallet detail) | ✅ (dedicated flow in `app/wallets/create.tsx` web branch) | `POST /v1/wallets/share` |
| Wallet detail (shared) | ✅ | ✅ | `app/wallets/[id].tsx` – allowed only if `is_shared` |
| Add / edit transactions on shared wallet | ✅ | ✅ | Local SQLite + best-effort `syncWalletTransactions()` → `POST .../transactions/sync` |
| View shared transactions (cloud) | ✅ (local-first) | ✅ | `GET .../transactions` (new) |
| Invite / remove members | ✅ | ✅ (owner only) | `POST .../invitations`, `DELETE .../members/:id` |
| Disable sharing | ✅ owner | ✅ owner | `PATCH .../share/disable` |
| Personal wallets | ✅ | ❌ hidden (`webSharedWalletsOnlyFilter`) | `src/lib/platform/webGuards.ts:25` |
| Analytics, Budgets, Goals, Categories, Receipts, SMS, Backups, Biometrics | ✅ | ❌ `AppOnlyBlock` | `app/(tabs)/analytics.tsx`, `src/components/web/LeftRail.tsx` |
| Offline personal history | ✅ | ❌ AppOnly |  |

The left rail (`src/components/web/LeftRail.tsx:103`) on web shows **Home / Wallets (shared-filtered) / Shared** as primary; Analytics/Categories/Budgets/Goals render as disabled with an “App only” badge and their screens render `<AppOnlyBlock/>`.

---

## 5. Backend Changes in This Patch

- `cloud-backend/src/routes/wallets.ts`: added
  - `GET /v1/wallets/:walletId/transactions?limit=&offset=&since=` – paginated cloud read for web.
  - `DELETE /v1/wallets/:walletId/transactions/:externalId` – removal parity.
- No schema change required (`001_shared_wallets.sql` already has `shared_transactions`).

---

## 6. Web Build & Vercel Deploy

### Build locally
```bash
npm install --legacy-peer-deps
npm run web:export   # → dist/
npx serve dist       # smoke test http://localhost:3000
```

### Deploy to Vercel

1. Import repository in Vercel → **Framework Preset: Other**, **Build Command:** `npm run vercel-build`, **Output Directory:** `dist`.
2. `vercel.json` at repo root sets SPA fallback + immutable asset caching (already committed).
3. **Environment variables on Vercel project** (Expo app):
   - `EXPO_PUBLIC_CLOUD_API_BASE_URL=https://cloud.pf.eiteone.org` (or your backend URL)
   - `EXPO_PUBLIC_WEB_APP_URL=https://<your-vercel-web>.vercel.app` (optional, for invite link base)
4. **Environment variables on the backend** (`cloud-backend/.env` / Vercel/Render):
   - `DATABASE_URL=postgres://...`
   - `JWT_SECRET=<32+ hex chars>`
   - `CORS_ORIGIN=https://<vercel-web>.vercel.app,https://pf.eiteone.org`  # comma-separated
   - `INVITATION_BASE_URL=https://<vercel-web>.vercel.app`
   - `APP_DEEP_LINK_SCHEME=pocketflow`
   - `TRUST_PROXY=true` when behind Vercel/Render proxy

5. After deploy, verify:
   - `GET https://cloud.pf.eiteone.org/health` → `ok`
   - Web: unauthenticated visiting `/` shows Sign-in wall; after `Profile → Create Account → Sign In`, `Shared` lists wallets, `Wallets` shows only shared, `Analytics` shows AppOnlyBlock.

### Alternative: host `webpage` + app under one Vercel project
Keep `webpage/` (Next.js marketing) as the same Vercel project at `/` and mount the Expo static export at `/app` via `vercel.json` rewrites. Requires merging `dist/` into `webpage/public/app`. Not implemented in this patch – leave `webpage` as a separate Vercel project (`pf.eiteone.org`).

---

## 7. File Map for This Feature

- `src/lib/platform/webGuards.ts` – central `isWeb`, `isSharedWallet`, `webSharedWalletsOnlyFilter`
- `src/components/web/AppOnlyBlock.tsx` – reusable AppOnly + auth walls
- `src/components/web/LeftRail.tsx` – web-conditional nav (shared-only + app-only badges)
- `src/lib/services/cloud/sharedWalletService.ts` – added `listSharedWalletTransactions`, `deleteSharedWalletTransaction`
- `cloud-backend/src/routes/wallets.ts` – new `GET`/`DELETE` transaction endpoints
- `app/_layout.tsx` – unified `initDb`+`ensureTables` for web (IndexedDB) + native
- `app/(tabs)/index.tsx`, `wallets.tsx`, `analytics.tsx`, `wallets/create.tsx`, `transactions/add.tsx` – web gates
- `vercel.json`, `package.json` scripts, `docs/WEB_STRATEGY.md`

---

## 8. Future Migration Path (if you outgrow Expo Web)

1. Scaffold `web/` with Next.js 15 App Router using the same `cloud-backend` contract.
2. Reuse `src/lib/services/cloud/*` as a plain `fetch` wrapper (drop `expo-constants`).
3. Keep Expo mobile as-is; shared wallet contract is backend-driven so both surfaces stay in sync.
