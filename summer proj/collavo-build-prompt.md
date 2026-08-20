# Collavo — Full Build Prompt (Secure, MongoDB + Azure, Maps, Verification, Escrow Wallet, Admin Panel)

Use this as your prompt for Claude Code, Cursor, or any AI coding tool. Paste it in full, then build phase by phase instead of asking for everything at once.

## Project Summary

Build Collavo, a React web app that connects brands with content creators for paid promotions and collaborations. Two user types: Business and Creator, plus a hidden third role, Admin, that only you control. Businesses must verify their identity with documents before they can operate. When a proposal is accepted by both sides, the deal amount locks into an in-app virtual currency escrow. Creators claim that virtual currency and an admin manually converts it to a real payout, since there's no payment processor wired in yet.

## Tech Stack

- **Frontend**: React 18 with Vite, React Router v6, Tailwind CSS, Zustand for state, Lucide React for icons
- **Backend**: Node.js with Express, deployed on Azure App Service
- **Database**: MongoDB (Azure Cosmos DB for MongoDB API, or MongoDB Atlas, either works with the same Mongoose code)
- **Auth**: Custom JWT auth (access token + refresh token) with bcrypt password hashing, plus Google OAuth via Passport.js as an identity provider only
- **File storage**: Azure Blob Storage, private containers for profile photos, portfolio images, event images, and verification documents
- **Secrets**: Azure Key Vault for API keys, JWT secrets, and database connection strings
- **Maps**: Google Maps JavaScript API, Places API, Geocoding API
- **Monitoring**: Azure Application Insights for error tracking, request logging, and admin action logging

## User Roles

Three roles now: `creator`, `business`, and `admin`. Creator and business are picked at public signup. Admin accounts are never created through the public signup form. You create them yourself directly in the database or through a one-time seed script, so there's no signup path anyone could exploit to grant themselves admin access.

## 1. Authentication Flow

**Screens: Landing → Role Select → Sign Up / Sign In**

- Landing screen: app name, tagline, "Get Started" button.
- Role select screen: two large cards, "I'm a Creator" and "I'm a Business". Tapping one sets the role and moves to sign up.
- Sign up / sign in screen: Google OAuth button, email and password fields, toggle link between sign up and sign in.
- After first sign up, route to a short profile setup: name, profile photo, bio, home location (Google Places autocomplete, stored as coordinates), and category (content type for creators, business type for businesses).
- Store `role`, `category`, `bio`, `photoURL`, `location`, `createdAt` on the user document.

## 2. Business Verification (required before a business can operate)

A business account is not allowed to post events, browse creators' contact details, or send proposals until it's verified. This is the main line of defense against scam accounts.

- Right after profile setup, a business sees a "Verify Your Business" screen instead of the home page.
- Required uploads: business registration certificate or trade license, a government-issued ID of the account owner, and optionally a tax registration number. Accept PDF, JPG, PNG, max 10MB per file.
- Store files in a private Azure Blob Storage container, never public. Generate short-lived signed URLs when an admin needs to view them.
- Set `verificationStatus: pending` on submission. Show the user a "Under Review, usually takes 24 to 48 hours" screen with limited read-only access to browse the app, but no ability to send proposals or unlock creator contact details.
- Admin reviews the documents in the admin panel (section 5) and sets status to `verified` or `rejected` with a reason. Rejected businesses see the reason and can re-upload.
- Send an in-app notification and email when status changes.
- Creators do not need document verification to keep signup friction low, but flag any creator account for admin review if it gets reported multiple times.

## 3. Home Page Layout

Match the screenshot structure top to bottom.

### Top bar
- Left: circular profile photo, tappable, opens the profile panel (section 4).
- Center: search bar, placeholder "Search Events...", filter icon inside opens category, location radius, and date range filters.
- Right: circular icon button, opens the menu described in section 4.5.

### Quick action grid
Four rounded cards: Businesses / Creators (order depends on role), Saved, Proposals.

### Notice banners
Dismissible cards, colored left border:
- "Complete your profile" for missing fields
- "Verify Your Business" for unverified businesses, links straight to the verification screen

### Categories row
Horizontal scroll pills, filtered by role as before (business types for creators browsing, content categories for businesses browsing).

### Platforms row
Facebook, Instagram, TikTok, YouTube pills.

### Featured Events
Horizontal scroll of large image cards with a category chip and title.

### Nearby Events (Google Maps powered)
List and map toggle. MongoDB `2dsphere` geo query with a radius slider (5km, 10km, 25km, 50km). Map pins open a popup with name, distance, and a link to details.

### All Events
Vertical list, sortable Latest or Oldest.

## 4. Profile Panel

Profile photo, name, role badge, category, bio, three stat blocks (Work Completed, In Progress, Rating), reviews list below. For businesses, show a small "Verified" badge with a checkmark if `verificationStatus: verified`, so creators can trust who they're dealing with at a glance.

## 4.5 Top Right Menu (three dots)

Connected Socials, Wallet, Your Work, Notifications, Support, Legal, Settings, same as before. Wallet now shows real detail, see section 6.

## 5. Bottom Navigation

**Home** — section 3.

**Proposals** — All, Pending, Accepted, Rejected tabs. When a proposal is accepted by both sides, trigger the escrow lock described in section 6 automatically, no manual step from either user. The proposal card shows an escrow status chip (Funds Secured, Released, or Pending Verification if the business isn't verified yet, which should never let a proposal reach accepted in the first place, see the guard rule in section 6). Meetup location map unlocks after acceptance, same as before.

**Messages** — Message Requests and Conversations, same as before.

**Activity** — notifications feed, now also includes wallet events (funds secured, payout claimed, verification approved or rejected).

## 6. Virtual Currency and Escrow System

This replaces a real payment processor for now. It has to behave like real money even though it isn't, so treat every balance change as a ledger entry, never a number you just edit directly.

### How funds get into the app
- A business wants to load funds. They contact the admin outside the app (bank transfer, cash, whatever you set up) and pay real money.
- The admin logs into the admin panel, finds the business account, and manually creates a "Top Up" transaction for the amount received. This credits the business's virtual wallet balance in MongoDB. Log the admin's ID, the amount, a reference note (like a bank transaction ID), and a timestamp on every top up for auditing.
- The business now sees that balance in their in-app Wallet page. No card numbers or bank details ever touch your database, since the money is handled entirely outside the app by the admin.

### How a deal locks funds
- A business sends a proposal with an offer amount. The proposal cannot be sent if the business's available wallet balance is lower than the offer amount, checked server side. This stops a business from promising money it doesn't have loaded.
- **Guard rule**: a proposal can only be accepted if the sending business has `verificationStatus: verified`. Reject the accept action server side if not, even if the frontend button is somehow clicked.
- When both the creator and the business have accepted the proposal, the backend automatically moves the offer amount from the business's available balance into an escrow hold, tagged to that proposal. This is the "money got secured automatically" behavior you asked for. Neither user has to do anything extra, it fires off the acceptance event.
- The business's available balance drops immediately. The creator does not yet see it as claimable, it's locked until the work is marked complete.

### How a creator gets paid
- Once the work is done, either a manual "Mark Complete" action from the business, or a mutual confirmation from both sides (safer, since it stops a business from claiming work wasn't done to avoid paying), releases the escrow. The held amount moves from escrow into the creator's claimable balance.
- Add a simple dispute path: if the business doesn't confirm completion within a set window (say 7 days) after the creator marks their side complete, auto release to the creator, so a business can't just stall forever to avoid paying.
- The creator sees their claimable balance in their Wallet page and can hit "Request Payout".
- A payout request creates a pending withdrawal record visible in the admin panel. The admin verifies it, sends the real money outside the app (bank transfer, mobile wallet, whatever you set up), then marks the withdrawal as `paid` in the admin panel, which deducts it from the creator's virtual balance and closes the ledger entry.

### Wallet page (user facing)
Shows: available balance, escrow held (for businesses, funds tied up in active deals), claimable balance (for creators), and a transaction history list (top ups, escrow locks, releases, withdrawals) each with a date, amount, and status.

## 7. Admin Panel (hidden, developer-only)

This must not be discoverable from the regular app. No link in the nav, no mention in the client bundle's visible routes list, and it should not show up to search engines.

### Hiding and access
- Serve the admin panel at an unguessable path, for example `/ops-9f3k2` instead of `/admin`, and store that path in an environment variable so it's not hardcoded in a way someone could find by reading public source. Changing the path later doesn't require a code change.
- Even better, run the admin panel as a completely separate small React app or route group, built and deployed separately from the main client bundle, so admin code and routes never ship inside the regular user-facing JavaScript at all. This means someone inspecting the main site's bundle can't even see that admin routes exist.
- Add `X-Robots-Tag: noindex, nofollow` header and a `robots.txt` disallow rule for the admin path.
- Require a separate admin login screen with its own JWT audience claim, so an admin token can't be reused on user routes and a user token is rejected outright on admin routes, checked server side on every request.
- Restrict access at the network level too using Azure App Service's IP access restrictions, so only your home or campus IP (or a VPN you control) can even reach the admin routes, on top of the login requirement. Two layers, not one.
- Log every admin action (verification decisions, wallet top ups, withdrawal approvals, any user edits) to a separate `AdminAuditLog` collection with the admin's ID, the action, the target, and a timestamp. This protects you too, since you'll have a record of every balance change you made.

### Admin panel features
- **Business verification queue**: list of pending businesses, view uploaded documents through signed URLs, approve or reject with a reason.
- **User management**: search users, view profile details, suspend or ban an account (for scams or abuse reports).
- **Wallet management**: search a user, view their balance and full ledger, create a top up transaction, view and process pending withdrawal requests.
- **Proposal and escrow overview**: see all active escrow holds, useful for spotting stuck disputes.
- **Reports and flags**: if you add a report button anywhere in the user app (recommended, for scam or abuse reporting), the queue shows up here.
- **Basic analytics**: total users by role, total verified businesses, total virtual currency in circulation, pending withdrawal total. Simple numbers, not a full dashboard, this isn't the focus of the project.

## 8. Data Models (MongoDB / Mongoose)

```js
// User
{
  role: { type: String, enum: ['creator', 'business', 'admin'], required: true },
  name: String,
  email: { type: String, unique: true, required: true },
  passwordHash: String,
  photoURL: String,
  bio: String,
  category: String,
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number], address: String },
  socials: { instagram: String, tiktok: String, youtube: String, facebook: String },
  workCompleted: { type: Number, default: 0 },
  workInProgress: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  emailVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['not_applicable', 'pending', 'verified', 'rejected'], default: 'not_applicable' },
  suspended: { type: Boolean, default: false },
  refreshTokens: [{ token: String, expiresAt: Date }],
  createdAt: { type: Date, default: Date.now }
}
// index: { location: '2dsphere' }

// BusinessVerification
{
  userId: { type: ObjectId, ref: 'User' },
  documents: [{ type: String, url: String, uploadedAt: Date }], // url is a private blob path, not public
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  reviewedBy: { type: ObjectId, ref: 'User' }, // admin id
  rejectionReason: String,
  submittedAt: Date,
  reviewedAt: Date
}

// Wallet
{
  userId: { type: ObjectId, ref: 'User', unique: true },
  availableBalance: { type: Number, default: 0 },
  escrowHeld: { type: Number, default: 0 },
  claimableBalance: { type: Number, default: 0 }
}
// Never edit these fields directly from a route handler triggered by user input.
// Always derive changes through a Transaction entry inside a MongoDB session/transaction
// so the wallet and the ledger can never drift out of sync.

// Transaction (the ledger, source of truth for every balance change)
{
  type: { type: String, enum: ['topup', 'escrow_lock', 'escrow_release', 'withdrawal'], required: true },
  userId: { type: ObjectId, ref: 'User' },
  counterpartyId: { type: ObjectId, ref: 'User' }, // e.g. the other side of an escrow lock
  proposalId: { type: ObjectId, ref: 'Proposal' },
  amount: Number,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  adminId: { type: ObjectId, ref: 'User' }, // set for topups and withdrawal payouts
  referenceNote: String,
  createdAt: { type: Date, default: Date.now }
}

// AdminAuditLog
{
  adminId: { type: ObjectId, ref: 'User' },
  action: String,
  targetType: String,
  targetId: ObjectId,
  details: Object,
  createdAt: { type: Date, default: Date.now }
}

// Event
{
  title: String, image: String, category: String, platform: String,
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number], address: String },
  date: Date, createdBy: { type: ObjectId, ref: 'User' }, description: String, budget: Number
}
// index: { location: '2dsphere' }

// Proposal
{
  fromUserId: { type: ObjectId, ref: 'User' },
  toUserId: { type: ObjectId, ref: 'User' },
  eventId: { type: ObjectId, ref: 'Event' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  offerAmount: Number,
  message: String,
  meetupLocation: { coordinates: [Number], address: String },
  escrowStatus: { type: String, enum: ['none', 'held', 'released', 'disputed'], default: 'none' },
  businessConfirmedComplete: { type: Boolean, default: false },
  creatorConfirmedComplete: { type: Boolean, default: false },
  creatorConfirmedAt: Date, // used for the auto-release timer
  createdAt: Date,
  updatedAt: Date
}

// Conversation
{ participantIds: [{ type: ObjectId, ref: 'User' }], lastMessage: String, lastMessageAt: Date, isRequest: Boolean }

// Message
{ conversationId: { type: ObjectId, ref: 'Conversation' }, senderId: { type: ObjectId, ref: 'User' }, text: String, read: Boolean, createdAt: Date }

// Notification
{ userId: { type: ObjectId, ref: 'User' }, type: String, relatedId: ObjectId, message: String, read: Boolean, createdAt: Date }

// Review
{ reviewerId: { type: ObjectId, ref: 'User' }, revieweeId: { type: ObjectId, ref: 'User' }, rating: Number, comment: String, createdAt: Date }
```

## 9. Security Requirements

- Hash passwords with bcrypt, minimum 12 salt rounds.
- Short-lived access tokens (15 minutes), rotating refresh tokens in HttpOnly, Secure, SameSite=Strict cookies, blacklisted on rotation.
- Rate limit login, signup, and payout request endpoints with `express-rate-limit`.
- Validate every request body with Zod or Joi before it reaches your database logic.
- Sanitize MongoDB queries against NoSQL injection with `express-mongo-sanitize`, use strict Mongoose schemas.
- Role based access control on every route, checked server side, including the separate admin JWT audience described in section 7.
- Security headers with `helmet`, explicit CORS allowlist, HTTPS everywhere, TLS through Azure App Service.
- Wrap every wallet balance change (top up, escrow lock, escrow release, withdrawal) in a MongoDB transaction so the ledger and the wallet document update together or not at all, never partially.
- Restrict uploads (profile photos and verification documents) to real image or PDF bytes, not just file extensions, cap file size, store in private Blob containers, serve through short-lived signed URLs.
- Sanitize all user generated text against XSS, both frontend with DOMPurify and server side by stripping HTML tags before saving.
- Log security relevant events (failed logins, password changes, role changes, all admin actions) to Application Insights and the AdminAuditLog collection, never log passwords or tokens.

## 10. Suggested File Structure

```
client/                      (public-facing app: creators and businesses)
  src/
    components/
      layout/, home/, proposals/, messages/, activity/, wallet/, verification/
    pages/
      Landing, RoleSelect, SignUp, SignIn, ProfileSetup, VerifyBusiness,
      Home, Proposals, Messages, ChatDetail, Activity, EventDetail,
      Wallet, YourWork, Support, Legal, Settings
    store/, lib/

admin-client/                (separate app, separate build, separate deploy)
  src/
    pages/ (AdminLogin, VerificationQueue, UserManagement, WalletManagement, ProposalOverview, Reports, Analytics)
    store/, lib/

server/
  models/ (User, BusinessVerification, Wallet, Transaction, AdminAuditLog, Event, Proposal, Conversation, Message, Notification, Review)
  routes/
    public/ (auth, users, events, proposals, messages, notifications, reviews, wallet)
    admin/  (adminAuth, verification, userManagement, walletManagement, auditLog)
  middleware/ (auth, adminAuth, rateLimiter, validate, sanitize)
  config/ (db.js, azureBlob.js, keyVault.js)
  server.js
```

## 11. Build Order

1. Backend skeleton on Azure App Service, MongoDB connection, User model, JWT auth with refresh token rotation
2. Frontend auth flow and role selection
3. Business verification screen and document upload, plus the admin verification queue as its own small separate admin app from day one, not bolted on later
4. Home page static layout with mock data, matching the screenshot
5. Wire real events into featured, nearby, and all events, add the geo query and Maps view toggle
6. Profile panel with stats, reviews, and the verified badge
7. Proposals with the four filter states, wire the verification guard rule on accept
8. Wallet model, ledger transactions, admin top up flow, escrow lock on mutual acceptance, escrow release on completion confirmation, payout request and admin payout flow
9. Messages, then Activity feed wired to real events including wallet notifications
10. Security pass: rate limiting, helmet, input validation, RBAC on every route including the admin audience check, MongoDB transactions around every wallet change, `npm audit`
11. Wallet page polish, Your Work, Support, Legal, Settings

## 12. Notes for a Mid Year Project

Build the escrow flow with fake test amounts first (Business A tops up 5000, sends a 1000 proposal to Creator B, both accept, funds lock, business marks complete, funds release, creator requests payout, admin marks paid). Once that full loop works end to end with two test accounts, everything else in the app is just UI wrapped around a proven core. The admin panel doesn't need to be pretty, it needs to be correct, since it's the one part of this app where a bug means real money math is wrong. Spend your polish time on the parts a judge or professor will actually see, and spend your careful, unhurried time on the wallet logic.
