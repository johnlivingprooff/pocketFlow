# pocketFlow

<p align="center">
	<img src="./assets/logo.png" alt="pocketFlow logo" width="220" />
</p>

Offline-first personal finance tracker built for quick daily use. pocketFlow keeps your wallets, transactions, and receipt images on-device with fast analytics so you always know where your money is going.

## What the app does
- Track multiple wallets with balances in different currencies
- Log income, expenses, and internal transfers with receipt photos
- Get instant summaries: income, expenses, net, top categories, and trends
- View history with filters, search, and category drill-down
- Stay offline-first: everything is stored locally in SQLite with receipt files

## Download
- Grab the latest builds from the GitHub Releases page: [Releases](https://github.com/johnlivingprooff/pocketFlow/releases)
- Use the newest tag to get the current preview APK/ZIP

## Quick start
```bash
npm install
npx expo start
```
- For web preview: `npx expo start --web`

## Permissions
- Camera & Media Library (receipt capture)
- File System read/write (receipts and backups)
- Local Authentication (optional biometric lock)

## Tech (kept light)
- React Native + Expo Router
- TypeScript (strict), Zustand for state
- SQLite (async `openDatabaseAsync`) with file-based receipts
- Reanimated + Gesture Handler for smooth interactions

## File layout (brief)
- Receipts: `DocumentDirectory/receipts/YYYY-MM-DD/{filename}.jpg`
- Backups: `DocumentDirectory/backups/pocketFlow_backup_{timestamp}.json`

## Notes
- Offline-first: all data lives on-device
- Transfers are excluded from income/expense analytics (internal movements)
