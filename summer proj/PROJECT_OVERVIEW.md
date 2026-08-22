# Collavo (CollabVo) — Comprehensive Project & Architecture Overview

> **Repository:** `CollabVo/summer proj`  
> **Tech Stack:** Node.js (Express, ES Modules), MongoDB (Mongoose / Memory ReplSet), React 18, Vite, Tailwind CSS, Zustand, SSE (Server-Sent Events), Azure Blob Storage / Key Vault.

---

## 1. Executive Summary & Vision

**Collavo** is a hyperlocal influencer marketing and creator-collaboration platform. It bridges the gap between **local businesses and brands** and **digital content creators** (across Instagram, TikTok, YouTube, Facebook) for sponsored visits, promotional campaigns, and reviews.

### The Problem It Solves
1. **Payment Insecurity & Scams:** Businesses risk paying upfront without receiving content; creators risk completing promotional work without getting paid.
2. **Trust & Identity Verification:** Risk of fake business campaigns or fraudulent accounts.
3. **Hyperlocal Discovery:** Difficulty in finding relevant local influencers or nearby business opportunities within specific cities.

### The Collavo Solution
- **Escrow-Secured Deals:** Financial transactions are locked in escrow when both parties agree and released only upon verified completion of work (with a 7-day auto-release safety net).
- **KYC Business Verification:** Businesses must submit registration certificates and government IDs for admin approval before posting campaigns or sending offers.
- **Geospatial Discovery:** MongoDB `2dsphere` geospatial indexing connects creators and businesses based on proximity.
- **Real-Time Communication:** Live direct messaging and push notifications powered by Server-Sent Events (SSE).
- **Operations & Moderation Hub:** A dedicated Developer/Admin panel for KYC document reviews, wallet ledger control, dispute resolution, and audit tracking.

---

## 2. Key User Roles & Permissions

| Role | Description | Key Capabilities | Restrictions |
| :--- | :--- | :--- | :--- |
| **Creator** | Content creator, influencer, videographer. | Browse campaigns, apply with custom quotes, negotiate proposals, receive funds via escrow, request bank payouts, chat in real-time, leave reviews, and report users. | Cannot post campaign events; cannot top-up wallet directly. |
| **Business** | Local business, brand, cafe, resort, agency. | Create campaigns/events, invite creators, negotiate proposals, fund wallet, lock funds in escrow, review work deliverables, and release payments. | Must be **KYC-verified** by Admin before creating events or sending proposals. |
| **Admin** | Platform operator and moderator. | Review and approve/reject business KYC documents, approve top-up requests, process creator withdrawals, force-release or refund disputed escrows, suspend malicious accounts, and view platform metrics and audit logs. | Accessed via obfuscated route (`/api/ops-9f3k2`). |

---

## 3. End-to-End Core Workflows

### 3.1 Authentication & Profile Setup
- **Registration / Login:** Email + bcrypt password hash or Google OAuth 2.0.
- **Session Strategy:** Dual JWT token architecture:
  - **Access Token:** Short-lived (15 mins), sent via `Authorization: Bearer <token>`.
  - **Refresh Token:** Long-lived (30 days), stored as HttpOnly, Secure, SameSite=Strict cookie, hashed in MongoDB (`SHA-256`) with a 5-token rotation limit.
- **Onboarding:** Automatic redirect to `/setup` if profile name/details are missing.

### 3.2 Business KYC Verification Workflow
```
[Business User] Uploads Registration Certificate + Government ID
       │
       ▼
[Backend] Saves to Azure Blob Storage (or local /uploads fallback)
       │
       ▼
[BusinessVerification Model] Status set to 'pending'
       │
       ▼
[Admin Panel Queue] Admin inspects uploaded documents
       │
   ┌───┴────────────────────────┐
   ▼                            ▼
[Approve]                     [Reject]
User.verificationStatus       User.verificationStatus = 'rejected'
  = 'verified'                Rejection reason sent via notification
Can now post & hire           Prompted to re-upload
```

### 3.3 The Escrow Deal Lifecycle
```
          [Business Posts Campaign Event]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[Business Sends Proposal]         [Creator Applies to Event]
(Pre-accepts: businessAccepted)    (Pre-accepts: creatorAccepted)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
           [Second Party Clicks Accept]
                         │
                         ▼
           ┌─────────────────────────────┐
           │     ESCROW LOCK TRIGGER     │
           │  Checks Business Wallet     │
           │  availableBalance >= offer  │
           │  Locks offer -> escrowHeld  │
           │  Proposal status='accepted' │
           │  escrowStatus='held'        │
           └─────────────┬───────────────┘
                         ▼
              [Creator Executes Work]
                         │
             [Creator Marks Complete]
       (creatorConfirmedComplete = true)
                         │
   ┌─────────────────────┴─────────────────────────┐
   ▼                                               ▼
[Business Confirms]                    [Business Inactive for 7 Days]
businessConfirmedComplete = true       Auto-sweep cron activates
   │                                               │
   └─────────────────────┬─────────────────────────┘
                         ▼
           ┌─────────────────────────────┐
           │    ESCROW RELEASE TRIGGER   │
           │  Deduct Business escrowHeld │
           │  Credit Creator claimable   │
           │  Proposal escrow='released' │
           └─────────────┬───────────────┘
                         ▼
        [Creator Requests Wallet Payout]
                         │
         [Admin Approves & Pays Payout]
```

### 3.4 Wallet & Financial Ledger Model
Each user has a single `Wallet` document with 3 balance pools:
- `availableBalance`: Free balance ready to be locked into escrow.
- `escrowHeld`: In-flight funds committed to active deals.
- `claimableBalance`: Earned creator earnings available for withdrawal.

All financial state transitions use **MongoDB Multi-Document ACID Transactions** (`session.withTransaction`) paired with an immutable entry in the `Transaction` collection (`topup`, `topup_request`, `escrow_lock`, `escrow_release`, `withdrawal`, `admin_deduct`, `escrow_refund`).

### 3.5 Real-Time Messaging & Notifications (SSE)
- Uses HTTP `text/event-stream` (Server-Sent Events).
- Client connects to `/api/messages/stream?token=...` via `EventSource`.
- Supports direct messaging, multi-window synchronization, and push notifications for events (proposal received, escrow locked/released, KYC status change).

---

## 4. System Architecture & Directory Map

```
summer proj/
│
├── client/                     # User React SPA (Port 5173)
│   ├── src/
│   │   ├── components/         # Layout (TopBar, BottomNav, Sidebar), UI Modals (PostEvent, SubmitProposal, Reviews)
│   │   ├── pages/              # Landing, Home, Proposals, Messages, Wallet, EventDetail, ProfileView, Verify...
│   │   ├── store/              # Zustand stores (authStore, notificationStore, themeStore)
│   │   └── lib/                # api.js (fetch wrapper + auto-refresh), useMessagesSSE.js, maps.js
│   └── vite.config.js
│
├── admin-client/               # Admin Operations React SPA (Port 5174)
│   ├── src/
│   │   ├── pages/              # VerificationQueue, UserManagement, WalletManagement, ProposalOverview, ReportsQueue...
│   │   └── lib/                # api.js, useAdminAuth.js
│   └── vite.config.js
│
├── server/                     # Express REST API & SSE Server (Port 4000)
│   ├── src/
│   │   ├── config/             # env.js, db.js, memoryDb.js, azureBlob.js, keyVault.js
│   │   ├── middleware/         # auth.js, adminAuth.js, rateLimiter.js, sanitize.js, upload.js, validate.js
│   │   ├── models/             # User, Event, Proposal, Wallet, Transaction, BusinessVerification, Conversation...
│   │   ├── routes/
│   │   │   ├── public/         # auth, users, events, proposals, messages, notifications, wallet, reviews, reports...
│   │   │   └── admin/          # adminAuth, adminPanel, verification, userManagement, walletManagement, reports...
│   │   ├── services/           # escrowService.js (ACID escrow operations & sweep), notificationService.js
│   │   ├── utils/              # sseManager.js (SSE connection pool & event dispatch)
│   │   └── server.js           # Server bootstrap, auto dev-admin, memory-mongo init, cron setup
│   └── scripts/
│       └── e2e-test.mjs        # Full automated end-to-end integration test suite
│
├── uploads/                    # Local storage fallback directory
├── run.bat                     # Windows one-click start script
├── start-demo.ps1              # Background PowerShell startup script
└── deploy-azure.ps1            # Azure App Service + Blob + KeyVault deployment script
```

---

## 5. Database Schema & Data Models

| Collection | Model Name | Key Fields & Purpose |
| :--- | :--- | :--- |
| `users` | `User` | Role (`creator`/`business`/`admin`), `email`, `passwordHash`, `verificationStatus` (`not_applicable`/`pending`/`verified`/`rejected`), `location` (GeoJSON `Point`), `socials`, `works` (portfolio), `rating`, `suspended`, `refreshTokens`. |
| `events` | `Event` | `title`, `description`, `category`, `platform`, `budget`, `location` (GeoJSON `Point` with `2dsphere` index), `date`, `createdBy` (Ref `User`). |
| `proposals` | `Proposal` | `fromUserId`, `toUserId`, `eventId`, `offerAmount`, `status` (`pending`/`accepted`/`rejected`), `escrowStatus` (`none`/`held`/`released`/`disputed`), `businessAccepted`, `creatorAccepted`, `creatorConfirmedComplete`, `businessConfirmedComplete`. |
| `wallets` | `Wallet` | `userId` (unique Ref `User`), `availableBalance`, `escrowHeld`, `claimableBalance`. |
| `transactions` | `Transaction` | `type` (`topup`, `topup_request`, `escrow_lock`, `escrow_release`, `withdrawal`, `admin_deduct`, `escrow_refund`), `userId`, `counterpartyId`, `proposalId`, `amount`, `status` (`pending`/`completed`/`failed`), `adminId`, `referenceNote`. |
| `businessverifications` | `BusinessVerification` | `userId`, `documents` (`[{ type, url, uploadedAt }]`), `status` (`pending`/`verified`/`rejected`), `taxNumber`, `rejectionReason`, `reviewedBy`. |
| `conversations` | `Conversation` | `participantIds` (`[User]`), `lastMessage`, `lastMessageAt`, `isRequest` (boolean). |
| `messages` | `Message` | `conversationId`, `senderId`, `text`, `read` (boolean). |
| `notifications` | `Notification` | `userId`, `type`, `message`, `relatedId`, `read` (boolean). |
| `reports` | `Report` | `reporterId`, `reportedUserId`, `eventId`, `reason` (`scam`/`spam`/`harassment`/`inappropriate`/`other`), `details`, `status`, `resolutionNotes`. |
| `reviews` | `Review` | `reviewerId`, `revieweeId`, `rating` (1–5), `comment`. |
| `adminauditlogs` | `AdminAuditLog` | `adminId`, `action`, `targetType`, `targetId`, `details` (immutable audit trail of all admin actions). |

---

## 6. Key Security & Reliability Highlights

1. **In-Memory MongoDB Replica Set for Local Dev:**
   - In local development without an external `MONGO_URI`, `mongodb-memory-server` spins up an in-memory replica set (`MongoMemoryReplSet`).
   - This allows MongoDB multi-document transactions to function seamlessly with zero external configuration.
2. **Obfuscated Admin Path & Role Isolation:**
   - Admin routes are mounted under `/api/${ADMIN_ROUTE_PATH}` (defaults to `/api/ops-9f3k2`).
   - Distinct JWT audience claims (`JWT_ADMIN_AUDIENCE` vs `JWT_USER_AUDIENCE`) prevent standard user tokens from accessing administrative routes.
3. **Storage Abstraction & SAS Tokens:**
   - File uploads support Azure Blob Storage with short-lived SAS tokens.
   - Automatically falls back to local `./uploads` directory if Azure credentials are not set.
4. **Security Hardening:**
   - `express-mongo-sanitize` for NoSQL injection prevention.
   - Separate rate limiters for general API traffic, auth attempts, uploads, and payouts.
   - `helmet` security headers.

---

## 7. Development & Testing Commands

### Quick Start
- **Windows CMD:** Run `run.bat`
- **PowerShell:** Run `.\start-demo.ps1`

### Pre-configured Demo Accounts
- **Verified Business:** `demo.business@collavo.app` / `Demo@1234` (Wallet pre-loaded with ₹5,000)
- **Creator:** `demo.creator@collavo.app` / `Demo@1234`
- **Pending KYC Business:** `demo.pending@collavo.app` / `Demo@1234`
- **Admin:** `admin@collavo.app` / `AdminPass123!`

### Automated End-to-End Test Suite
```bash
cd server
npm run test:e2e
```
*Runs an automated 12-stage validation test verifying account creation, profile setup, document KYC verification, wallet top-ups, campaign creation, escrow lock/release, payouts, and moderation.*
