# pocketFlow - Project Structure

## Root Files
```
├── app.json                    # Expo configuration
├── babel.config.js             # Babel config with Reanimated plugin
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript strict config
└── README.md                   # Setup instructions
```

## App Directory (Expo Router)
```
app/
├── _layout.tsx                 # Root layout, initializes DB
├── index.tsx                   # Home dashboard screen
├── onboarding/
│   └── index.tsx               # Onboarding welcome screen
├── receipt/
│   └── scan.tsx                # Receipt scanning with camera/gallery
├── settings/
│   ├── index.tsx               # Settings home (theme, biometric toggle)
│   ├── currency.tsx            # Default currency setting
│   └── security.tsx            # Biometric authentication setup
├── transactions/
│   ├── add.tsx                 # Add income/expense with receipt
│   ├── edit.tsx                # Edit transaction (stub)
│   └── history.tsx             # Transaction history list
└── wallets/
    ├── index.tsx               # Wallet list
    ├── create.tsx              # Create new wallet
    └── [id].tsx                # Wallet detail (dynamic route)
```

## Source Directory (Business Logic)
```
src/
├── components/                 # Reusable UI components
│   ├── AddButton.tsx           # Action button with accent color
│   ├── AnalyticsSummary.tsx    # Mini stats cards
│   ├── ReceiptPreview.tsx      # Receipt image preview
│   ├── TransactionItem.tsx     # Transaction list item
│   └── WalletCard.tsx          # Wallet display card
├── constants/
│   └── categories.ts           # Predefined transaction categories
├── lib/
│   ├── db/                     # SQLite database layer
│   │   ├── index.ts            # DB connection & table creation
│   │   ├── transactions.ts     # Transaction CRUD & analytics
│   │   └── wallets.ts          # Wallet CRUD & balance calc
│   ├── hooks/                  # React hooks
│   │   ├── useTransactions.ts  # Transaction data hook
│   │   └── useWallets.ts       # Wallet data hook with balances
│   └── services/               # Business services
│       ├── fileService.ts      # File storage & backup/restore
│       └── ocrService.ts       # OCR placeholder (optional)
├── store/
│   └── useStore.ts             # Zustand stores (settings, UI state)
├── theme/
│   └── theme.ts                # Color palette & theme helpers
├── types/
│   ├── transaction.ts          # Transaction type definitions
│   └── wallet.ts               # Wallet type definitions
└── utils/
    ├── date.ts                 # Date formatting utilities
    └── formatCurrency.ts       # Currency display helper
```

## Assets Directory
```
assets/
├── icon.png                    # App icon (placeholder)
├── splash.png                  # Splash screen (placeholder)
├── adaptive-icon.png           # Android adaptive icon (placeholder)
└── favicon.png                 # Web favicon (placeholder)
```

## Key Features by File

### Database Layer (`src/lib/db/`)
- **index.ts**: Opens SQLite DB, creates tables on startup
- **wallets.ts**: CRUD operations, balance calculation
- **transactions.ts**: CRUD, filtering, monthly analytics, category breakdown

### Screens (`app/`)
- **index.tsx**: Dashboard with total balance, wallet carousel, quick actions
- **wallets/**: Create, list, and view wallet details
- **transactions/add.tsx**: Form with camera/gallery integration, compress images
- **receipt/scan.tsx**: Dedicated receipt capture screen
- **settings/**: Theme toggle, currency config, biometric lock

### Components (`src/components/`)
- Themed components using palette from `theme.ts`
- Accessibility labels on interactive elements
- Currency formatting with Intl API fallback

### State Management (`src/store/`)
- **useSettings**: Theme mode, default currency, biometric flag
- **useUI**: Active wallet tracking for navigation

### Services (`src/lib/services/`)
- **fileService**: Save receipts to `DocumentDirectory/receipts/YYYY-MM-DD/`
- **fileService**: Export/import JSON backups to `DocumentDirectory/backups/`
- **ocrService**: Stub for future OCR integration

## Color Palette (from logo)
- `#6B6658` - Muted warm grey
- `#010000` - Near black
- `#B3B09E` - Soft neutral beige
- `#84670B` - Deep gold/mustard (accent)
- `#332D23` - Dark earthy brown

## Analytics Queries Available
```typescript
// Monthly income vs expense
analyticsTotalsByMonth(year, month)

// Category spending breakdown
analyticsCategoryBreakdown(year, month)

// Total available cash across all wallets
totalAvailableAcrossWallets()

// Individual wallet balance
getWalletBalance(walletId)
```

## Run Commands
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web
```

## Notes
- Offline-first architecture: All data in SQLite + FileSystem
- TypeScript strict mode enabled
- Parameterized queries prevent SQL injection
- Images compressed before storage
- Ready for Reanimated animations (hooks prepared)
