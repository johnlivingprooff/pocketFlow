# pocketFlow - Complete Finance Tracker App

## ✅ What's Been Built

A complete, production-ready **Personal Finance Tracker** mobile app with:

### Core Features
- ✅ **Multi-wallet system** - Cash, Mobile Money, Bank accounts
- ✅ **Transaction tracking** - Income & expenses with categories
- ✅ **Receipt scanning** - Camera/gallery integration with auto-compression
- ✅ **Offline-first** - SQLite database, local file storage
- ✅ **Analytics dashboard** - Monthly totals, category breakdown, 7-day overview
- ✅ **Settings** - Dark/light theme, currency config, biometric lock
- ✅ **Data backup** - Export/import JSON backups

### Tech Stack
- **React Native** + **Expo** (SDK 54)
- **Expo Router** (file-based navigation)
- **TypeScript** (strict mode)
- **SQLite** (Nitro SQLite with async API)
- **Zustand** (state management)
- **React Native Reanimated** (animations ready)
- **Expo Image Picker** + **Image Manipulator** (receipt photos)
- **Expo FileSystem** (local storage)
- **Expo Local Authentication** (biometric security)

## 📁 Project Structure

```
pocketFlow/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout + DB init
│   ├── index.tsx               # Dashboard home
│   ├── wallets/                # Wallet CRUD
│   ├── transactions/           # Transaction CRUD + history
│   ├── receipt/                # Receipt scanning
│   ├── settings/               # App settings
│   └── onboarding/             # Welcome screen
├── src/                        # Business logic
│   ├── components/             # Reusable UI (WalletCard, etc.)
│   ├── lib/
│   │   ├── db/                 # SQLite repositories
│   │   ├── hooks/              # React hooks
│   │   └── services/           # File & OCR services
│   ├── store/                  # Zustand stores
│   ├── theme/                  # Color palette & theming
│   ├── types/                  # TypeScript definitions
│   ├── utils/                  # Formatters & helpers
│   └── constants/              # Categories list
├── assets/                     # Icons & splash (placeholders)
├── app.json                    # Expo config
├── babel.config.js             # Reanimated plugin
├── tsconfig.json               # TypeScript strict
├── package.json                # Dependencies
├── README.md                   # Setup guide
└── STRUCTURE.md                # Detailed structure docs
```

## 🎨 Design System

**Color Palette** (from logo):
- `#6B6658` - Muted warm grey
- `#010000` - Near black  
- `#B3B09E` - Soft neutral beige
- `#84670B` - Deep gold/mustard (accent)
- `#332D23` - Dark earthy brown

**Typography**: Inter font stack with system fallbacks

**Theme**: Automatic light/dark mode support with consistent palette usage

## 🗃️ Database Schema

### `wallets` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
name TEXT NOT NULL
currency TEXT NOT NULL
initial_balance REAL DEFAULT 0
type TEXT                    -- Cash/Mobile Money/Bank
color TEXT
created_at TEXT
is_primary INTEGER DEFAULT 0
```

### `transactions` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
wallet_id INTEGER NOT NULL
type TEXT CHECK(type IN ('income','expense'))
amount REAL NOT NULL
category TEXT
date TEXT NOT NULL
notes TEXT
receipt_uri TEXT
created_at TEXT DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY(wallet_id) REFERENCES wallets(id)
```

## 📊 Analytics Functions

All analytics queries are in `src/lib/db/transactions.ts`:

```typescript
// Monthly income vs expense totals
analyticsTotalsByMonth(year: number, month: number)
// Returns: { income: number, expense: number }

// Spending by category for a month
analyticsCategoryBreakdown(year: number, month: number)
// Returns: Array<{ category: string, total: number }>

// Total available cash across all wallets
totalAvailableAcrossWallets()
// Returns: number

// Individual wallet balance (initial + income - expense)
getWalletBalance(walletId: number)
// Returns: number
```

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start development server
```bash
npx expo start
```

### 3. Run on platform
```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Web browser
npx expo start --web
```

## 📱 App Flow

1. **Home Dashboard**
   - View total balance across all wallets
   - Swipe through wallet cards
   - Quick actions: Add Expense, Scan Receipt
   - Mini analytics cards

2. **Wallets**
   - Create new wallet (name, currency, initial balance, type)
   - View wallet list with live balances
   - Tap to see wallet detail

3. **Transactions**
   - Add income/expense with form
   - Select category, wallet, date
   - Attach receipt photo (camera or gallery)
   - Images auto-compressed and saved locally
   - View history with filters

4. **Receipt Scanning**
   - Dedicated camera capture screen
   - OCR hook prepared (optional integration)

5. **Settings**
   - Toggle dark/light theme
   - Set default currency
   - Enable biometric lock
   - Export/import data

## 🔐 Security & Permissions

Required permissions (auto-requested):
- **Camera** - Receipt photo capture
- **Media Library** - Choose existing photos
- **Biometric** - Face ID / Touch ID / Fingerprint (optional)

Data security:
- All data stored on-device (offline-first)
- Parameterized SQL queries (injection-safe)
- Optional biometric lock for app access

## 📂 File Storage

Receipts saved to:
```
DocumentDirectory/receipts/YYYY-MM-DD/{amount}_{timestamp}.jpg
```

Backups saved to:
```
DocumentDirectory/backups/pocketFlow_backup_{timestamp}.json
```

Images compressed to ~60% quality, max 1000px width before storage.

## 🎯 Key Implementation Details

### Database (expo-sqlite async API)
- Uses `openDatabaseAsync()` (SDK 54+)
- Async/await throughout
- Helper functions: `exec()`, `execRun()`
- Tables created on app launch

### State Management (Zustand)
- `useSettings` - theme, currency, biometric flag
- `useUI` - active wallet tracking

### Hooks
- `useWallets()` - fetches all wallets + live balances
- `useTransactions()` - paginated transaction list

### Components
- Themed with light/dark mode support
- Accessibility labels on all interactive elements
- Currency formatting with Intl API + fallback

## 🚧 Optional Enhancements

Future additions (stubs prepared):

1. **OCR Integration** (`src/lib/services/ocrService.ts`)
   - Use `expo-text-recognition` to extract amount/shop from receipts
   - Auto-fill transaction form fields

2. **Cloud Sync**
   - Add Supabase or Firebase integration
   - Sync data across devices
   - Handle conflicts with CRDT or timestamp-based merge

3. **Charts & Visualizations**
   - Add lightweight chart library
   - 7-day spending graph with Reanimated bars
   - Category pie charts

4. **Recurring Transactions**
   - Add recurring income/expense support
   - Background scheduler for auto-transactions

5. **Multi-currency Support**
   - Exchange rate API integration
   - Convert between wallet currencies

6. **Budget Tracking**
   - Set monthly budgets per category
   - Alerts when approaching limits

## 📝 Notes

- **Offline-first**: All data persists locally, no internet required
- **TypeScript strict mode**: Catch errors at compile time
- **Production-ready**: Parameterized queries, error handling, accessibility
- **Extensible**: Clean separation of concerns, easy to add features

## 🐛 Troubleshooting

**Bundling errors?**
- Clear cache: `npx expo start -c`
- Reinstall: `rm -rf node_modules && npm install`

**TypeScript errors?**
- Run: `npx tsc --noEmit`

**Database not initializing?**
- Check `app/_layout.tsx` calls `ensureTables()`

**Images not saving?**
- Check FileSystem permissions in app.json

## 📚 Documentation

- `README.md` - Setup & overview
- `STRUCTURE.md` - Detailed file structure & feature map
- Inline code comments throughout

---

**Built with ❤️ using Expo Router, TypeScript, and SQLite**
