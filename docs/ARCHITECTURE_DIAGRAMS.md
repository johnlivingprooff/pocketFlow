# pocketFlow Web Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         pocketFlow Application                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │               Shared Business Logic Layer                       │   │
│  │  (Hooks, Services, Store, Utils - Works on All Platforms)      │   │
│  │                                                                  │   │
│  │  • useWallets, useTransactions, useBudgets, etc.               │   │
│  │  • Transaction operations, Category management                  │   │
│  │  • Analytics calculations, Recurring transactions               │   │
│  │  • Zustand stores with AsyncStorage persistence                │   │
│  └────────────────┬─────────────────────────────────────────────┬──┘   │
│                   │                                             │       │
│         ┌─────────▼────────────┐                   ┌───────────▼────┐  │
│         │  Platform Detection  │                   │ getDbAsync()   │  │
│         │   (Platform.OS)      │                   │   [CRITICAL]   │  │
│         └────────┬──────────────┘                   └────┬──────────┘  │
│                  │                                       │              │
│    ┌─────────────┴─────────────┐                       │              │
│    │                           │                        │              │
│    ▼ (web)                     ▼ (ios/android)        ▼              │
│  ┌────────────┐              ┌────────────┐      ┌─────────────┐    │
│  │  WebShell  │              │  (tabs)    │      │  Database   │    │
│  │  3-Column  │              │  Bottom    │      │   Layer     │    │
│  │  Layout    │              │  Tabs      │      └─────────────┘    │
│  │            │              │  Layout    │            │             │
│  │ LeftRail   │              │            │            │             │
│  │ Content    │              │ Tabs for:  │      ┌─────┴─────┐      │
│  │ RightPanel │              │ - Home     │      │           │      │
│  │            │              │ - Wallets  │   ┌──▼─┐     ┌──▼──┐   │
│  └────┬───────┘              │ - Analytics│   │Web │     │Mobile│   │
│       │                      │ - Settings │   │ DB │     │  DB  │   │
│       │                      │            │   └──┬─┘     └──┬──┘   │
│       │                      └────────────┘      │           │      │
│       │                                          │           │      │
│       └──────────────┬───────────────────────────┤           │      │
│                      │                           │           │      │
│         ┌────────────▼──────────────┐           │           │      │
│         │   All Platform Screens    │           │           │      │
│         │  (Work Identically)       │           │           │      │
│         │                           │           │           │      │
│         │ • Home Dashboard          │           │           │      │
│         │ • Wallets Screen          │           │           │      │
│         │ • Analytics Charts        │           │           │      │
│         │ • Categories Manager      │           │           │      │
│         │ • Budget Tracker          │           │           │      │
│         │ • Goals Dashboard         │           │           │      │
│         │ • Transaction Forms       │           │           │      │
│         │ • Receipt Scanner         │           │           │      │
│         └───────────────────────────┘           │           │      │
│                      ▲                          │           │      │
│                      │                          │           │      │
│                      └──────────┬───────────────┤           │      │
└─────────────────────────────────┼───────────────┼───────────┼──────┘
                                  │               │           │
                    ┌─────────────▼─┐          ┌──▼──┐     ┌──▼──┐
                    │ NitroSQL Core │          │sql. │     │Nitro│
                    │ (Mobile only) │          │ js  │     │SQL  │
                    └───────────────┘          │WASM │     │Conn │
                                               │     │     │     │
                                            ┌──▼──┐  │  ┌──▼──┐ │
                                            │Index│  │  │ iOS/│ │
                                            │edDB │  │  │Droid│ │
                                            │     │  │  │SQLite
                                            └─────┘  │  └─────┘ │
                                                     │          │
                                            Browser Storage   Phone Storage
                                            (Persistent)      (Persistent)
```

---

## Web-Specific Data Flow

```
User Action in Browser
        │
        ▼
   ┌──────────────────┐
   │  React Component │
   │  or Hook         │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────────┐
   │  Business Logic Layer    │
   │  (useWallets, etc)       │
   └────────┬─────────────────┘
            │
            ▼
   ┌──────────────────────────┐
   │  getDbAsync()            │
   │  Platform.OS check       │
   │  (Always returns promise)│
   └────────┬─────────────────┘
            │
            ▼ (web path)
   ┌──────────────────────────┐
   │  getWebDatabase()        │
   │  Returns cached instance │
   └────────┬─────────────────┘
            │
            ▼
   ┌──────────────────────────┐
   │  WebDatabaseImpl          │
   │  (webDriver.ts)          │
   └────┬───────────┬──────┬──┘
        │ check     │ init │
        ▼           ▼      ▼
   ┌────────────────────────────────┐
   │  IndexedDB (Browser API)       │
   │  Database: pocketflow_web      │
   │  Store: database               │
   │  Key: pocketflow               │
   │  Value: Uint8Array (binary)    │
   └──────────────┬─────────────────┘
                  │
       ┌──────────┴──────────┐
       │ (if need load)      │ (if need save)
       ▼                     ▼
   ┌──────────────┐    ┌─────────────────┐
   │loadFromIndex │    │saveToIndexedDB  │
   │edDB          │    │(after execute)  │
   └──────┬───────┘    └────────┬────────┘
          │                     │
          ▼                     ▼
   ┌──────────────────────────────────┐
   │  sql.js Database (in memory)     │
   │  SQL operations execute here     │
   │  Fast (no I/O)                   │
   └──────────────┬───────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────┐
   │  Execute SQL Statement           │
   │  SELECT/INSERT/UPDATE/DELETE     │
   │  Returns { rows: { _array: [] }} │
   └──────────────┬───────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────┐
   │  Write Operation?                │
   │  (INSERT/UPDATE/DELETE)          │
   └───────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼ (yes)
    [Return]    ┌──────────────────────┐
    [Result]    │  enqueueWebWrite()   │
                │  WriteQueue          │
                │  Serialize writes    │
                └───────────┬──────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ saveToIndexedDB()    │
                  │ Persists binary data │
                  │ Async (non-blocking) │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ Data persisted!      │
                  │ Survives reload      │
                  └──────────────────────┘
```

---

## Component Hierarchy (Web)

```
GestureHandlerRootView (root container)
│
├─ Platform.OS check
│  │
│  ├─ (web)
│  │  │
│  │  └─ WebShell
│  │     │
│  │     ├─ LeftRail
│  │     │  ├─ Navigation items (6)
│  │     │  │  • Home, Wallets, Analytics, Categories, Budgets, Goals
│  │     │  ├─ Add Transaction CTA
│  │     │  └─ Toggle button (collapse/expand)
│  │     │
│  │     ├─ Stack (Expo Router - center content)
│  │     │  ├─ (tabs)
│  │     │  │  ├─ index.tsx (Home)
│  │     │  │  ├─ wallets.tsx (Wallets)
│  │     │  │  ├─ analytics.tsx (Analytics)
│  │     │  │  └─ settings.tsx (Settings)
│  │     │  │
│  │     │  ├─ transactions/add (modal form)
│  │     │  ├─ transactions/[id] (details)
│  │     │  ├─ wallets/create (form)
│  │     │  ├─ categories/create (form)
│  │     │  └─ ... (other routes)
│  │     │
│  │     └─ RightPanel
│  │        ├─ Profile Section
│  │        │  • Avatar
│  │        │  • User name
│  │        │  • Default currency
│  │        │
│  │        ├─ Theme Menu
│  │        │  • Light/Dark/System toggle
│  │        │
│  │        ├─ Storage Section
│  │        │  • Mode toggle (Browser/File)
│  │        │  • Export button → Download .db file
│  │        │  • Import button → File picker
│  │        │
│  │        └─ Links
│  │           • Settings
│  │           • Help
│  │
│  └─ (not web - mobile)
│     └─ Stack (standard Expo Router)
│        ├─ (tabs)
│        │  ├─ index.tsx (Home)
│        │  ├─ wallets.tsx (Wallets)
│        │  ├─ analytics.tsx (Analytics)
│        │  └─ settings.tsx (Settings)
│        │
│        └─ ... (modal routes same as web)
│
└─ BiometricAuthOverlay (if needed)
   ├─ Logo
   ├─ App name
   ├─ Description
   └─ Fingerprint button
```

---

## Storage Architecture

### Mobile
```
Device Storage (Native SQLite)
│
├─ /data/data/com.pocketflow/databases/pocketflow.db
│  │
│  ├─ wallets table
│  ├─ transactions table
│  ├─ categories table
│  ├─ budgets table
│  └─ goals table
│
├─ /Documents/pocketflow/receipts/
│  └─ image files
│
└─ AsyncStorage
   └─ Settings, user preferences
```

### Web (Browser)
```
IndexedDB (Browser API)
│
└─ Database: pocketflow_web
   │
   └─ Object Store: database
      │
      └─ Key: pocketflow
         │
         └─ Value: Uint8Array (binary)
            │
            └─ [Loaded into sql.js memory on startup]
               │
               ├─ wallets table
               ├─ transactions table
               ├─ categories table
               ├─ budgets table
               └─ goals table

Browser Storage Tree:
F12 → Application → IndexedDB
       → pocketflow_web (database)
           → database (store)
               → pocketflow (key)
                   → [binary blob ~500KB-2MB depending on data]
```

---

## Responsive Behavior

```
Desktop (> 1024px width)
┌────────────────────────────────────────────────┐
│ ┌────────┐ ┌──────────────────┐ ┌───────────┐ │
│ │        │ │                  │ │  Profile  │ │
│ │ Left   │ │     Content      │ │  Theme    │ │
│ │ Rail   │ │     Area         │ │  Storage  │ │
│ │ 220px  │ │   (flex: 1)      │ │  Settings │ │
│ │        │ │                  │ │  320px    │ │
│ └────────┘ └──────────────────┘ └───────────┘ │
└────────────────────────────────────────────────┘

Tablet (< 1024px width)
┌────────────────────────────────────┐
│ ┌──┐ ┌──────────────────────────┐  │
│ │  │ │                          │  │
│ │  │ │     Content Area         │  │
│ │64 │ │     (flex: 1)           │  │
│ │px │ │                          │  │
│ │  │ │                          │  │
│ │  │ │  [Float button at 📋]    │  │
│ │  │ │  opens sidebar drawer    │  │
│ └──┘ └──────────────────────────┘  │
└────────────────────────────────────┘

Mobile (<768px width)
┌──────────────────────────┐
│ ┌───────────────────────┐│
│ │                       ││
│ │   Content Area        ││
│ │   (full width)        ││
│ │                       ││
│ │                       ││
│ │  [Hamburger] [Panel]  ││  (floating buttons)
│ │      📋         👤    ││
│ └───────────────────────┘│
└──────────────────────────┘
```

---

## Request Flow Example: Load Wallets on Web

```
User navigates to /wallets screen
        ↓
Wallets screen component mounts
        ↓
useWallets() hook called
        ↓
Hook: getWallets() business function
        ↓
Business function: db = await getDbAsync()
        ↓
getDbAsync: Platform.OS === 'web'? YES
        ↓
Return: getWebDatabase()
        ↓
WebDatabase check cache:
  _instance exists? 
        ↓ (first time - no)
  IndexedDB.open('pocketflow_web')
        ↓
  Check store 'database', key 'pocketflow'
        ↓
  Found? 
        ↓ (yes - data exists from previous session)
  Load Uint8Array from IndexedDB
        ↓
  sql.js: Database.deserialize(data)
        ↓
  In-memory SQL.js database ready
        ↓ (cache for next calls)
  Return WebDatabaseImpl instance
        ↓
Business function: results = await db.executeAsync('SELECT * FROM wallets')
        ↓
WebDatabase.executeAsync():
  sql.js.run('SELECT * FROM wallets')
        ↓
  Format result as: { rows: { _array: [...] } }
        ↓
Return to business function
        ↓
Business function returns array of wallets
        ↓
Hook updates React state: setWallets(data)
        ↓
Component re-renders with wallet list
        ↓
User sees wallets displayed!
```

---

## Write Operation Flow Example: Add Transaction

```
User submits Add Transaction form
        ↓
App calls: addTransaction(transaction)
        ↓
Business logic:
  db = await getDbAsync()  [Returns web driver]
  await db.executeAsync(INSERT query, params)
        ↓
WebDatabase.executeAsync():
  sql.js.run('INSERT INTO transactions...')
        ↓
  Write detected (INSERT)
        ↓
  Call saveToIndexedDB()
        ↓
  [Async background save]
  IndexedDB.put(database, key, binary)
        ↓
  Return immediately to caller
        ↓
Return result to business logic
        ↓
Call completed: Transaction added
        ↓
UI updates: Wallets, Analytics refresh
        ↓
After ~50-100ms:
  IndexedDB save completes
        ↓
Data is persistent (survives reload)
        ↓
If user force-closes browser now,
  Next load reads from IndexedDB ✓
```

---

## Database Comparison

| Feature | Mobile (Nitro SQLite) | Web (sql.js + IndexedDB) |
|---------|----------------------|--------------------------|
| Engine | Native SQLite | sql.js WASM |
| Storage | Phone filesystem | IndexedDB |
| Speed | Fast (native) | Fast (in-memory) |
| Persistence | Automatic | Explicit IndexedDB saves |
| Concurrency | Single writer (locking) | Single thread (WriteQueue) |
| Size | ~5MB binary | ~500KB-2MB |
| Offline | Yes | Yes |
| Cloud Sync | No (offline-first) | No (offline-first) |

---

## Error Recovery

```
Error occurs in sql.js operation
        ↓
Catch block in executeAsync
        ↓
Is it SQLITE_BUSY? (write lock)
        ↓ (yes)
WriteQueue: Retry with exponential backoff
  Wait 10ms
  Wait 20ms
  Wait 40ms
  Wait 80ms
  (max 3 retries)
        ↓
Success?
        ↓ (yes)
Return result
        ↓ (no - all retries failed)
Log error to logger.ts
        ↓
Throw to caller for app-level handling
        ↓
UI shows error message to user
```

---

## Key Integration Points

```
When App Initializes (app/_layout.tsx):
  1. Check if Platform.OS === 'web'
  2. If yes, wrap Stack in WebShell
  3. WebShell loads LeftRail + RightPanel
  4. Store calls initDb()
  5. initDb calls getDbAsync()
  6. getDbAsync detects 'web' platform
  7. Returns webDriver instance
  8. webDriver initializes sql.js + IndexedDB
  9. App ready to render

When User Navigates (Expo Router):
  1. Route changes
  2. Screen component mounts
  3. useWallets/useTransactions hooks called
  4. Hooks call getDb()
  5. db.executeAsync(query)
  6. Platform-transparent: works on web & mobile
  7. Data updates in state
  8. Component re-renders

When User Performs Write (Form submit):
  1. Business logic calls db.executeAsync(INSERT)
  2. WebDatabase detects write operation
  3. Queues in WriteQueue for serialization
  4. Executes in sql.js
  5. Saves to IndexedDB (async)
  6. Returns immediately
  7. IndexedDB eventually persists
  8. Data survives reload
```

---

## This Is The Complete Architecture

All the above flows, components, and data stores work together to provide a seamless cross-platform experience. The key insight is **platform abstraction at the database layer only** - everything above uses the same code.

For more details, see:
- `WEB_IMPLEMENTATION_COMPLETE.md` (technical overview)
- `WEB_TESTING_GUIDE.md` (testing instructions)
- `CODE_CHANGES_SUMMARY.md` (exact code changes)
