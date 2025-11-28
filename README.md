# pocketFlow

Personal Finance Tracker App built with Expo Router, TypeScript, SQLite, and Zustand.

## Stack
- React Native + Expo
- Expo Router
- TypeScript (strict)
- SQLite (expo-sqlite)
- Expo Image Picker / Camera
- Expo FileSystem
- Zustand
- Reanimated + Gesture Handler (hooks prepared; simple animations included)

## Theme
Palette from logo:
- #6B6658 (muted warm grey)
- #010000 (near-black)
- #B3B09E (neutral beige)
- #84670B (deep gold)
- #332D23 (earthy brown)

See `src/theme/theme.ts`.

## Database
Tables created on startup in `src/lib/db/index.ts`:
- wallets
- transactions

Uses **expo-sqlite** async API (SDK 54+) with `openDatabaseAsync()`.
Run-time migrations use `ensureTables()`.

## Analytics Examples
- Monthly totals: `analyticsTotalsByMonth(year, month)` in `lib/db/transactions.ts`
- Category breakdown: `analyticsCategoryBreakdown(year, month)`
- Wallet totals: `getWalletBalance(id)` and `totalAvailableAcrossWallets()`

## File System Layout
- `DocumentDirectory/receipts/YYYY-MM-DD/{filename}.jpg`
- `DocumentDirectory/backups/pocketFlow_backup_{timestamp}.json`

## Navigation (Expo Router)
See `app/` directory at root:
- `_layout.tsx` (ensures DB ready)
- `index.tsx` (dashboard)
- `wallets/*`
- `transactions/*`
- `receipt/scan.tsx`
- `settings/*`
- `onboarding/index.tsx`

All business logic in `src/` directory.

## Setup & Run

Install dependencies:
```bash
npm install
```

Start the app:
```bash
npx expo start
```

For web preview:
```bash
npx expo start --web
```

## Permissions
- Camera & Media Library (Image Picker/Camera)
- File System read/write
- Local Authentication (optional biometric)

## Testing Tips
- Create a wallet first (Wallets > Create)
- Add transactions and attach a receipt via gallery/camera
- Check History for list and filters (basic)

## Optional Enhancements
- OCR suggestions: integrate `expo-text-recognition` in `lib/services/ocrService.ts`
- Sync & cloud backup: add remote storage (Supabase/Cloudflare R2) with opt-in
- Multi-device sync: schema versioning + CRDT or server reconciliation
- Charts: add lightweight chart lib or Reanimated bars for 7-day overview
- Biometric gate on app start using `expo-local-authentication`

## Notes
- This is offline-first. All data stored on-device in SQLite and FileSystem.
- Use parameterized queries (implemented) to prevent injection.
