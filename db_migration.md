

# 📌 COPILOT AGENT PROMPT

## Task: Migrate Expo App from expo-sqlite to react-native-nitro-sqlite (Android-safe, JSI-based)

### Role

You are a **senior React Native + Expo engineer** with deep knowledge of **JSI, Android NDK, SQLite internals, Expo custom dev clients, and database migrations**.

Your goal is to **fully migrate this app from `expo-sqlite` to `react-native-nitro-sqlite`**, eliminating native connection instability on Android.

---

## 1️⃣ Initial Audit & Preconditions

### Step 1.1 – Identify Current SQLite Usage

* Locate **all imports** of:

  * `expo-sqlite`
  * `expo-sqlite/next`
* Identify:

  * Database initialization logic
  * Singleton / cached DB handles
  * Transaction helpers
  * Write queues or serialization logic
  * Background DB usage (timers, listeners, effects)

⚠️ Document:

* When the DB is opened
* Whether connections are reopened
* Whether async concurrency exists

---

### Step 1.2 – Confirm Expo Environment Constraints

* Verify this project uses **Expo SDK 54+**
* Confirm it currently runs in **Expo Managed Workflow**
* Determine whether **Expo Go** is used (it will no longer be usable after migration)

---

## 2️⃣ Prepare Native Environment (Mandatory)

### Step 2.1 – Switch to Custom Dev Client

* Ensure `expo-dev-client` is installed
* Confirm EAS is configured:

  * `eas.json` exists
* Prepare to build a **custom development client** (Expo Go is NOT supported with Nitro SQLite)

---

### Step 2.2 – Install react-native-nitro-sqlite

Install dependencies:

```bash
npm install react-native-nitro-sqlite
```

or

```bash
yarn add react-native-nitro-sqlite
```

Then ensure native linking is enabled via Expo prebuild.

---

### Step 2.3 – Prebuild Native Code

Run:

```bash
npx expo prebuild
```

Verify:

* Android project is generated
* CMake / NDK config includes Nitro SQLite
* No duplicate SQLite symbols exist

---

## 3️⃣ Database Architecture Migration

### Step 3.1 – Remove expo-sqlite

* Remove all references to:

  * `openDatabaseAsync`
  * `prepareAsync`
  * `execAsync`
  * `withTransactionAsync`
* Remove any workarounds related to:

  * Connection invalidation
  * Retry logic for `ERR_UNEXPECTED`
  * Handle reinitialization logic

---

### Step 3.2 – Initialize Nitro SQLite (Single Thread)

Create a **single DB instance** using Nitro SQLite:

* Use **one database connection per app lifecycle**
* Do NOT open/close per operation
* Do NOT share across threads manually

Example structure (agent must adapt to project style):

```ts
import { open } from 'react-native-nitro-sqlite';

export const db = open({
  name: 'app.db',
  location: 'default',
});
```

⚠️ Nitro SQLite uses **JSI**, so calls are **synchronous by design** — do not wrap in `async/await` unless returning promises explicitly.

---

## 4️⃣ Query Layer Refactor

### Step 4.1 – Replace Async Prepare Calls

Replace:

```ts
await stmt.executeAsync(...)
```

With **direct SQL execution**:

```ts
db.execute('INSERT INTO ...', [params]);
```

Ensure:

* Parameterized queries are preserved
* SQL remains unchanged
* No dynamic SQL concatenation is introduced

---

### Step 4.2 – Rebuild Transaction Logic

Use Nitro SQLite’s synchronous transaction model:

```ts
db.transaction(tx => {
  tx.execute('...');
  tx.execute('...');
});
```

⚠️ Do NOT:

* Nest transactions
* Run concurrent transactions
* Use JS timers inside transactions

---

## 5️⃣ Migrate Migrations Safely

### Step 5.1 – Schema Migration Strategy

* Reuse existing migration SQL
* Run migrations **once on app startup**
* Ensure migrations are:

  * Idempotent
  * Ordered
  * Wrapped in a transaction

Add a `schema_version` table if not present.

---

### Step 5.2 – Data Preservation

* Verify that Nitro SQLite accesses the **same physical database file path**
* Confirm:

  * Existing data loads correctly
  * No schema loss
  * WAL mode compatibility is maintained

---

## 6️⃣ Concurrency & Safety Guarantees

### Step 6.1 – Remove Write Queues

* Nitro SQLite is synchronous and thread-safe via JSI
* Remove JS-level write serialization unless required for business logic

---

### Step 6.2 – Background Usage Audit

* Ensure no DB calls are made from:

  * Background timers
  * Unmounted components
  * Race-prone hooks

Move DB access to:

* Controlled service layer
* Explicit lifecycle boundaries

---

## 7️⃣ Android Stability Validation

### Step 7.1 – Stress Test

Create a test scenario:

* Perform 50+ writes
* Delay app usage over 2–5 minutes
* Trigger background/foreground transitions
* Confirm:

  * No connection invalidation
  * No Native crashes
  * No NPEs

---

### Step 7.2 – Remove Legacy Recovery Code

* Delete:

  * Retry loops
  * Forced DB reopen logic
  * App-restart recovery hacks

They should no longer be necessary.

---

## 8️⃣ Build & Verify

### Step 8.1 – Build Custom Client

Run:

```bash
npx expo run:android
```

or via EAS:

```bash
eas build --profile development --platform android
```

Install and validate:

* DB survives long-running sessions
* No `prepareAsync` errors exist (should not exist at all)

---

## 9️⃣ Final Deliverables

The migration is complete only if:

* `expo-sqlite` is fully removed
* `react-native-nitro-sqlite` is the sole SQLite driver
* No async native DB calls remain
* App functions without restart after prolonged usage
* Android stability is confirmed

---

## 10️⃣ Output Expectations from Agent

You must:

* Modify code directly
* Explain breaking changes introduced
* Flag any unsafe concurrency you detect
* Provide a brief post-migration summary

---

### 🔒 Hard Rules

* Do NOT introduce ORMs
* Do NOT re-add expo-sqlite
* Do NOT assume Expo Go compatibility
* Do NOT mask errors with retries

---

**Objective:**
Eliminate native SQLite instability permanently by migrating to a JSI-based driver with deterministic lifecycle behavior.
