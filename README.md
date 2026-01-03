# pocketFlow

<p align="center">
	<img src="./assets/logo.png" alt="pocketFlow logo" width="220" />
</p>

**Offline-first personal finance tracker** built for quick daily use. pocketFlow keeps your wallets, transactions, and receipt images on-device with fast analytics so you always know where your money is going.

## ✨ Features

### 💰 Wallet Management
- Track multiple wallets with individual balances
- Support for different currencies per wallet
- Default currency: MWK (Malawian Kwacha), fully configurable
- Real-time balance calculations across all wallets

### 📊 Transaction Tracking
- Log income, expenses, and internal transfers
- Attach receipt photos to transactions
- Comprehensive categorization system
- Quick filters and search functionality
- Paginated transaction history

### 📈 Analytics & Insights
- Monthly income vs expense summaries
- Category-based spending breakdown
- Spending trends and patterns
- Total available cash across wallets
- Visual charts and reports

### 📸 Receipt Management
- Capture receipts with camera
- Select from photo library
- Automatic image compression (max 1000px, 60% quality)
- Organized file storage by date

### 🎯 Budgets & Goals
- Set monthly budgets by category
- Track savings goals with progress visualization
- Real-time budget status and alerts
- Goal completion tracking

### 🔒 Security & Privacy
- 100% offline - all data stored locally
- Optional biometric authentication
- No cloud sync, no data collection
- SQLite database with secure file storage

### 🎨 User Experience
- Light and dark theme support
- Smooth animations with Reanimated v4
- File-based routing with Expo Router
- Intuitive navigation and gestures

## 📥 Download

Get the latest builds from the [GitHub Releases](https://github.com/johnlivingprooff/pocketFlow/releases) page.

Available formats:
- **Android**: APK for direct installation
- **iOS**: Build from source (requires Xcode)

## 🚀 Quick Start

### Installation
```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

### Platform-Specific Development
```bash
# iOS
npx expo start --ios

# Android
npx expo start --android

# Web preview
npx expo start --web

# Clear cache if needed
npx expo start -c
```

### Build & Release
```bash
# Copy release builds (Windows PowerShell)
npm run release:copy

# Type checking
npx tsc --noEmit
```

## 🛠 Tech Stack

- **Framework**: React Native with Expo (SDK 54)
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript (strict mode)
- **Database**: expo-sqlite with async API (`openDatabaseAsync`)
- **State Management**: Zustand with AsyncStorage persistence
- **Animations**: React Native Reanimated v4
- **Styling**: Inline styles with theme system
- **File Storage**: Expo FileSystem for receipts and backups

## 📁 Project Structure

```
pocketFlow/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx        # Root layout with DB initialization
│   ├── (tabs)/            # Tab navigation (home, wallets, analytics, settings)
│   ├── wallets/           # Wallet management screens
│   ├── transactions/      # Transaction screens
│   ├── categories/        # Category management
│   ├── budgets/           # Budget management
│   ├── goals/             # Savings goals
│   └── receipt/           # Receipt scanning
├── src/
│   ├── components/        # Reusable UI components
│   ├── constants/         # App constants (categories, currencies)
│   ├── lib/
│   │   ├── db/           # SQLite database layer
│   │   ├── hooks/        # React hooks
│   │   └── services/     # Business services (file, OCR, biometric)
│   ├── store/            # Zustand state stores
│   ├── theme/            # Theme & color definitions
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
└── assets/               # Static assets (icons, images)
```

## 📂 File Storage

- **Receipts**: `DocumentDirectory/receipts/YYYY-MM-DD/{filename}.jpg`
- **Backups**: `DocumentDirectory/backups/pocketFlow_backup_{timestamp}.json`

All files are stored locally on your device.

## 🔐 Permissions

The app requires the following permissions:

- **Camera** - Capture receipt photos
- **Media Library** - Select existing photos
- **File System** - Store receipts and backups locally
- **Local Authentication** - Optional biometric lock

## 📚 Documentation

- [PROJECT_SUMMARY.md](./docs/PROJECT_SUMMARY.md) - Complete feature overview
- [STRUCTURE.md](./docs/STRUCTURE.md) - Detailed file structure
- [GOALS_BUDGETS_SPEC.md](./docs/GOALS_BUDGETS_SPEC.md) - Budgets & goals specification

## 🗂 Categories

### Expense Categories
Food • Transport • Rent • Groceries • Utilities • Shopping • Healthcare • Entertainment • Education • Bills • Transfer • Other

### Income Categories
Salary • Freelance • Business • Investment • Gift • Offering • Transfer • Other Income

## 🎯 Key Design Decisions

- **Offline-first**: All data lives on-device, no network required
- **SQLite with Write Queue**: Serialized writes prevent database lock errors
- **Type Safety**: Strict TypeScript mode with no `any` types
- **Parameterized Queries**: All database operations use prepared statements
- **Image Compression**: Automatic compression reduces storage footprint
- **Theme System**: Dynamic color palette supporting light/dark modes

## 📝 Notes

- Transfers are excluded from income/expense analytics (they're internal movements)
- All database write operations use a write queue to prevent SQLITE_BUSY errors
- Receipt images are compressed before storage to save space
- The app works completely offline with no external dependencies

## 🤝 Contributing

This is a personal project, but suggestions and bug reports are welcome via GitHub Issues.

## 📄 License

[MIT License](LICENSE) - Feel free to use this project as you see fit.

---

Built with ❤️ using React Native and Expo
