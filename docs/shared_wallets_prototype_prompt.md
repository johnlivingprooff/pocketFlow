# Shared Wallets -- Prototype Implementation Prompt

## Context

The app is offline-first.

We are introducing optional cloud accounts and shared wallets.

This phase focuses only on:

-   User accounts
-   Shared wallet infrastructure
-   Secure invitation system

No chat.\
No realtime sockets.\


The architecture must remain extensible for future cloud layering.

------------------------------------------------------------------------

# 1️⃣ Account Creation (UI Placement)

## Location

Settings → **Profile Section** → Profile Screen

Inside the Profile page:

-   If user is NOT logged in:
    -   Show "Create Account" button
    -   Show "Sign In" option
-   If user IS logged in:
    -   Show:
        -   Email
        -   Account status
        -   Logout button
        -   Delete account button

## Authentication Requirements

-   Email + Password
-   Password hashed with bcrypt (or equivalent)
-   JWT session tokens
-   Secure token storage on device
-   Token refresh mechanism
-   Logout invalidates session client-side
-   Account deletion removes:
    -   user
    -   wallet memberships (cascade safely)

## Database Table: `users`

-   id (uuid, primary key)
-   email (unique, indexed)
-   password_hash
-   created_at
-   updated_at

Constraints:

-   Email must be unique
-   No plaintext passwords
-   Index on email

------------------------------------------------------------------------

# 2️⃣ Shared Wallets Hub (UI Placement)

## Location

Settings → **Data & Storage Section** → Shared Wallets

This is a management hub, not part of the main wallet screen.

## Shared Wallets Hub Displays

-   Wallet name
-   Member count
-   Role (Owner / Member)
-   Sync status indicator

Clicking a wallet navigates to wallet details.

------------------------------------------------------------------------

# 3️⃣ Converting a Wallet to Shared

Inside Wallet Details Page:

Add:

-   Toggle: "Enable Shared Wallet"

When enabled:

-   Require user to be logged in
-   Generate unique `share_id`
-   Set `is_shared = true`
-   Create wallet_members entry for creator as Owner

When disabled (Owner only):

-   Remove share_id
-   Set `is_shared = false`
-   Remove all non-owner members

## Wallet Table

-   id (uuid)
-   name
-   created_by (user_id)
-   is_shared (boolean, default false)
-   share_id (unique, nullable)
-   created_at
-   updated_at

Indexes:

-   share_id
-   created_by

------------------------------------------------------------------------

# 4️⃣ Wallet Membership System

Table: `wallet_members`

-   wallet_id (foreign key)
-   user_id (foreign key)
-   role (owner \| member)
-   joined_at

Constraints:

-   Composite unique (wallet_id, user_id)
-   Cascade delete on wallet deletion
-   Owner cannot be removed without ownership transfer

Indexes:

-   wallet_id
-   user_id

------------------------------------------------------------------------

# 5️⃣ Invitation System (Privacy First)

No public user search.

Invitation via secure link only.

## Flow

Owner clicks "Invite Member":

-   Generate cryptographically secure token
-   Create entry in `wallet_invitations`
-   Copy deep link

Example:

https://yourdomain.com/invite/{token}

## Acceptance

1.  Open link\
2.  If not logged in → redirect to Profile → Register/Login\
3.  Validate token\
4.  Check expiration\
5.  Add user to wallet_members\
6.  Mark invitation accepted

## Table: `wallet_invitations`

-   id (uuid)
-   wallet_id (foreign key)
-   invited_by (user_id)
-   token (unique)
-   expires_at
-   accepted_at (nullable)
-   created_at

Security:

-   Token must be cryptographically random
-   Expire in 7 days
-   One-time use only
-   Server-side validation required

Indexes:

-   token
-   wallet_id

------------------------------------------------------------------------

# 6️⃣ Transaction Sync (Prototype Level)

If wallet is shared:

-   Transactions sync to cloud
-   Only members can read/write
-   Server-side permission enforcement
-   Conflict strategy: Last-write-wins (prototype only)

Polling acceptable. No realtime required.

------------------------------------------------------------------------

# 7️⃣ Permission Rules

Only wallet members can:

-   View wallet
-   Add transactions
-   Edit transactions

Only owner can:

-   Disable sharing
-   Invite members
-   Remove members

Server must enforce all permissions.

------------------------------------------------------------------------

# 8️⃣ Architectural Constraints

-   Neon Postgres
-   Foreign keys enforced
-   Proper indexing
-   Clear separation between offline and shared cloud wallets

Do NOT merge local and cloud logic blindly.\
Use wallet_id as strict boundary.

------------------------------------------------------------------------

# 9️⃣ Explicit Non-Goals

Do NOT implement:

-   Chat
-   File uploads
-   Public user search
-   Realtime presence
-   Role hierarchy beyond owner/member

------------------------------------------------------------------------

# 10️⃣ Deliverables

-   Database schema
-   Migration scripts
-   Auth endpoints
-   Invite endpoints
-   Membership endpoints
-   Permission middleware
-   Shared Wallet Hub UI
-   Profile-based account creation UI

------------------------------------------------------------------------

# Design Philosophy

This is infrastructure.

Not a social feature.

Build it:

-   Minimal
-   Secure
-   Extendable
-   Stable under sync

Chat will integrate later using wallet_id as boundary.
