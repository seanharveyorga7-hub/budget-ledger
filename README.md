# Budget Indicator & Obligation Ledger

A web app for tracking budget indicators and the obligations recorded against them. Built with **React (Vite)**, **Firebase Authentication** and **Cloud Firestore**, with **no Cloud Functions**. Every business rule is enforced in two places: in the client's Firestore transactions and in `firestore.rules` on the server.

## Features

| Module | What it does |
|---|---|
| **Budget Indicators** | Admins can create, edit and soft-delete indicators (only when nothing is obligated against it and its Realignment is ₱0.00, so realigned money never disappears). Each Activity Code is unique. The 12-month allocation has an **Auto-Distribute** button (any centavo remainder goes to December) and must add up exactly to the Annual Budget before it can be saved. |
| **Budget Realignment** | Moves funds from a source indicator to a target indicator in one atomic `runTransaction()`, after checking the source has enough available balance. Each transfer writes an append-only realignment log. |
| **Obligation Ledger** | Members record obligations against active indicators. Title and Object of Expenditure are filled in from the indicator. Entries are created and edited inside `runTransaction()`, so two users saving at once can never overspend an indicator. |
| **Audit trail & soft delete** | Every indicator and ledger document stores `createdBy/At`, `updatedBy/At` and `deletedBy/At`. The app never calls `deleteDoc()`, and the rules reject hard deletes. Soft-deleting a ledger entry returns its amount to the indicator's available balance. |
| **Guided tutorial** | A step-by-step tour of every feature, with content that depends on the user's role. It starts automatically on a user's first sign-in and can be replayed from the **Tutorial** button in the header. |
| **Settings (RBAC)** | System Admins promote or demote users. An admin cannot change their own role, which guarantees at least one admin always remains. |

```
Available Balance = (Annual Budget + Realignment) − Total Active Obligations
```

### Roles

| | `sys_admin` | `user` |
|---|---|---|
| View dashboard & indicators | ✅ | ✅ (read-only) |
| Create / edit / soft-delete indicators | ✅ | ❌ |
| Realign budgets | ✅ | ❌ |
| Create ledger entries | ✅ | ✅ |
| Edit ledger entries | ✅ any | ✅ own only |
| Soft-delete ledger entries | ✅ | ❌ |
| Settings (manage roles) | ✅ | ❌ |

---

## Setup

**Requirements:** Node.js 18+ and a Firebase project. You also need the Firebase CLI (`npm i -g firebase-tools`) to deploy the security rules.

1. **Create a Firebase project** at <https://console.firebase.google.com>.
2. **Enable Authentication:** go to *Build → Authentication → Sign-in method* and enable **Email/Password**.
3. **Create Firestore:** go to *Build → Firestore Database → Create database* and start in **production mode**.
4. **Register a web app:** go to *Project settings → General → Your apps → Web* and copy the config values.
5. **Configure the app:**
   ```bash
   cp .env.example .env.local
   # fill in the VITE_FIREBASE_* values from step 4
   ```
6. **Install & run:**
   ```bash
   npm install
   npm run dev          # http://localhost:5173
   ```
7. **Deploy the security rules.** This is required, because the rules are what enforce the budget limits and roles:
   ```bash
   firebase login
   firebase use --add          # choose your project
   npm run deploy:rules        # firebase deploy --only firestore:rules,firestore:indexes
   ```
8. *(Optional)* **Host it:** run `npm run build && firebase deploy --only hosting`.

### Login and page access

Firebase Authentication verifies credentials and shows a login error if sign-in fails. After sign-in, the app reads `users/{uid}` from Firestore and checks the assigned role:

- `sys_admin`: Dashboard, Indicators, all Ledger entries, and Settings.
- `user`: Dashboard, read-only Indicators, and their own Ledger entries. Dashboard ledger lists and monthly obligations also use only their entries; indicator budget totals remain shared.
- Missing profile, missing role, or unknown role: page access is denied. Contact a System Admin.

Profiles are created with the `user` role during account registration only. Signing in does not recreate a missing profile. Role changes apply live. React route and button guards control the interface; Firestore rules independently enforce roles and ledger ownership. Deploy rule changes with `npm run deploy:rules`.

### Setting the first System Admin

New accounts always start as `user`, and the rules reject any other role at sign-up. To create the very first admin:

1. Open the app and **create an account** (Sign in → *Create an account*).
2. In the Firebase Console, open **Firestore Database → `users` → the document for your account**. The document ID is your Auth UID, which you can also find under *Authentication → Users*.
3. Change the `role` field from `user` to `sys_admin` and save.
4. Back in the app, the change applies immediately because the profile is read live, so the **Settings** menu appears. From now on, promote other users from **Settings** instead of the console.

> Console edits bypass security rules, which is why this one-time step works. After this, only an existing `sys_admin` can change roles.

---

## Firestore collection structure

> **Money is stored as integer centavos.** For example, ₱1,234.56 is stored as `123456`. This keeps every balance check exact. The UI converts to pesos only for display.
> `Actor` = `{ uid: string, name: string }`

### `users/{uid}`
| Field | Type | Notes |
|---|---|---|
| `uid` | string | Same as the document ID |
| `email` | string | |
| `displayName` | string | |
| `role` | `'sys_admin' \| 'user'` | Always `'user'` at creation |
| `createdAt` | timestamp | |
| `roleUpdatedBy` / `roleUpdatedAt` | Actor / timestamp | Set when an admin changes the role |
| `tutorialCompletedAt` | timestamp | Set when the user finishes or skips the tutorial. Only the user can set it, and only to the server time |

### `indicators/{activityCode}`
The document ID **is** the Activity Code, which guarantees uniqueness without a query.

| Field | Type | Notes |
|---|---|---|
| `activityCode` | string | Uppercase, `A-Z 0-9 . _ -`, max 50 |
| `activityTitle` | string | |
| `objectOfExpenses` | `'PS' \| 'MOOE' \| 'CO' \| 'FE'` | Locked while obligations exist |
| `annualBudget` | int (centavos) | |
| `realignment` | int (centavos) | Net transfers in (+) or out (−). Default `0` |
| `monthlyAllocation` | int[12] | Jan–Dec. Must add up to `annualBudget` (checked by the rules too) |
| `totalObligations` | int (centavos) | Running total of active ledger amounts (see below) |
| `isDeleted` | bool | Soft-delete flag |
| `createdBy` / `createdAt` | Actor / timestamp | |
| `updatedBy` / `updatedAt` | Actor / timestamp | |
| `deletedBy` / `deletedAt` | Actor / timestamp | |
| `lastLedgerEntryId` / `lastRealignmentId` | string | Links each change to the ledger write or realignment log that caused it, so the rules can verify it |

### `ledger/{autoId}`
| Field | Type | Notes |
|---|---|---|
| `activityCode` | string | Must reference an active indicator |
| `activityTitle` | string | Copied from the indicator |
| `objectOfExpenditure` | string | Copied from the indicator. The rules check that it matches |
| `amount` | int (centavos) | > 0 |
| `date` | string `YYYY-MM-DD` | Transaction date |
| `particulars` | string | Optional, max 500 |
| `isDeleted` | bool | |
| `createdBy/At`, `updatedBy/At`, `deletedBy/At` | Actor / timestamp | Audit trail |

### `realignments/{autoId}` (append-only)
| Field | Type |
|---|---|
| `sourceCode`, `sourceTitle`, `sourceObject`, `sourceAvailableBefore` | string / string / string / int |
| `targetCode`, `targetTitle`, `targetObject`, `targetAvailableBefore` | string / string / string / int |
| `amount` | int (centavos) |
| `reason` | string |
| `createdBy` / `createdAt` | Actor / timestamp |

---

## How over-spending is prevented without Cloud Functions

Each indicator keeps a running total, `totalObligations`, so checking the balance means reading one document instead of adding up the whole ledger.

1. **Client (`src/services/ledgerService.js`):** each create, edit or soft delete runs in `runTransaction()`. It reads the indicator, checks `amount ≤ available`, then writes the ledger entry **and** the new `totalObligations` together. If another user changed the indicator in the meantime, Firestore re-runs the transaction with fresh data, so the second of two competing entries is rejected.
2. **Server (`firestore.rules`):** even someone who skips the app and writes to Firestore directly is held to these rules:
   - A ledger write is accepted only if the indicator's `totalObligations` changes by **exactly** the entry's amount in the same commit, checked with `getAfter()`.
   - An indicator's `totalObligations` can change only alongside a ledger write that belongs to that indicator.
   - Every indicator must always satisfy `annualBudget + realignment ≥ totalObligations`.
   - `realignment` changes only when a realignment log is written in the same transaction, and the log must match both indicators' deltas.
   - `allow delete: if false` everywhere.

## Testing

`npm run test:emulator` starts the Firebase Emulator Suite and runs `scripts/emulator-test.mjs`. That script calls the app's real services and the deployed rules, and covers 59 cases: RBAC, unique codes, the month-sum check, a concurrent over-budget race, ledger edits that move an entry between indicators, realignment, soft delete and blocked hard deletes. It needs **Java 11+**. `firebase-tools` is fetched with `npx`.

To develop against the emulators instead of a live project, set `VITE_USE_EMULATORS=true` in `.env.local` and run `firebase emulators:start` in a second terminal.

## Project structure

```
src/
├── components/        Reusable UI: DataTable, Modal/ConfirmDialog, FormControls, RoleGuards,
│   ├── indicators/    MonthlyAllocationEditor, AuditTrail, Layout, ui (Button, Badge, Card…)
│   └── ledger/        Feature modals (forms, detail views, realignment)
├── contexts/          AuthContext (user, profile, role, actor), ToastContext
├── hooks/             useIndicators, useLedger, useUsers, useRealignments, useSubscription
├── lib/               firebase.js (initialization, optional emulator connection)
├── pages/             Login, Dashboard, Indicators, Ledger, Settings
├── services/          All Firestore reads, writes and transactions
└── utils/             currency (centavos), monthly math, balance validators, input validators, dates, errors
firestore.rules        Server-side security & budget rules
scripts/               Emulator end-to-end test
```

UI components never import Firestore. They call `services/`, which use pure helpers from `utils/`.
