# Vitalis AI Subscription Integration - Visual Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER (Frontend)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     React Application                        │  │
│  │                                                               │  │
│  │  ┌────────────────────┐      ┌────────────────────┐        │  │
│  │  │  AuthContext       │      │ SubscriptionContext│        │  │
│  │  │  ────────────────  │      │ ─────────────────  │        │  │
│  │  │ • user.id          │      │ • tier             │        │  │
│  │  │ • user.email       │      │ • analysesUsed     │        │  │
│  │  │ • user.subscription│◄────►│ • limits           │        │  │
│  │  │                    │      │ • canAnalyze()     │        │  │
│  │  │ ✅ Syncs from      │      │ • recordAnalysis() │        │  │
│  │  │    /api/auth/me    │      │                    │        │  │
│  │  └────────────────────┘      │ ❌ Not synced from│        │  │
│  │         ▲                     │    /api/subscription/      │  │
│  │         │                     │    current YET!   │        │  │
│  │    [GET /auth/me]             │                    │        │  │
│  │         │                     └────────────────────┘        │  │
│  │         │                              ▲                     │  │
│  │         │                              │                     │  │
│  │  ┌──────┴──────────────────────────────┴──────────┐        │  │
│  │  │                                                │        │  │
│  │  │  Components Using Subscription:                │        │  │
│  │  │  • AIInsights.tsx (checks canAnalyze())   │        │  │
│  │  │  • Pricing.tsx (shows tiers)             │        │  │
│  │  │  • UpgradePrompt.tsx (modal)             │        │  │
│  │  │  • Navbar.tsx (shows current tier)       │        │  │
│  │  │                                                │        │  │
│  │  │  [POST /api/predictions/analyze]              │        │  │
│  │  │  ❌ NOT AUTHENTICATED YET                │        │  │
│  │  │  ❌ NO USAGE LIMIT CHECK                 │        │  │
│  │  │                                                │        │  │
│  │  └────────────────────────────────────────────────┘        │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────┐               │  │
│  │  │     Stripe Integration Points           │               │  │
│  │  │  ────────────────────────────────────  │               │  │
│  │  │  • loadStripe(pk_test_XXXX)            │               │  │
│  │  │  • CardElement for payment collection  │               │  │
│  │  │  • [POST /api/subscription/upgrade]    │               │  │
│  │  │    + paymentMethodId                   │               │  │
│  │  │    ✅ Creates Stripe customer          │               │  │
│  │  │    ❌ Incomplete subscription creation │               │  │
│  │  │                                         │               │  │
│  │  └────────────────────────────────────────┘               │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                           │ HTTPS
                           │
┌─────────────────────────────────────────────────────────────────────┐
│                    API SERVER (Backend)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │            Authentication Middleware                       │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │ checkUsageQuota()                                    │ │    │
│  │  │ ✅ Verifies JWT token                               │ │    │
│  │  │ ✅ Loads user from DB                               │ │    │
│  │  │ ✅ Checks subscription status                        │ │    │
│  │  │ ❌ NOT on /api/predictions/analyze yet              │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         Route Handlers (src/routes/)                       │    │
│  │                                                             │    │
│  │  [GET /api/auth/me]              ✅ COMPLETE             │    │
│  │  • Returns user with subscription object                  │    │
│  │  • AuthContext uses this to sync                          │    │
│  │                                                             │    │
│  │  [GET /api/subscription/current] ❌ NEEDS FRONTEND SYNC   │    │
│  │  • Returns full subscription details                      │    │
│  │  • Daily/monthly usage metrics                            │    │
│  │  • Stripe subscription ID                                 │    │
│  │                                                             │    │
│  │  [POST /api/subscription/upgrade] 🟡 INCOMPLETE           │    │
│  │  • ✅ Accepts newTier & paymentMethodId                   │    │
│  │  • ✅ Creates Stripe customer                             │    │
│  │  • ❌ Doesn't actually charge card                        │    │
│  │  • ❌ Incomplete subscription creation                    │    │
│  │  • ❌ No Stripe price ID mapping                          │    │
│  │                                                             │    │
│  │  [POST /api/predictions/analyze] 🟡 INCOMPLETE            │    │
│  │  • ❌ No authentication check                             │    │
│  │  • ❌ No subscription validation                          │    │
│  │  • ❌ No usage recording                                  │    │
│  │  • ✅ Runs drug rules & Gemini AI                         │    │
│  │                                                             │    │
│  │  [POST /api/webhooks/webhook] ✅ READY                    │    │
│  │  • Handles Stripe webhook events                          │    │
│  │  • customer.subscription.created                          │    │
│  │  • customer.subscription.updated                          │    │
│  │  • invoice.payment_succeeded                              │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │           Database Models (MongoDB)                        │    │
│  │                                                             │    │
│  │  User Schema:                                              │    │
│  │  ├─ firstName, lastName, email                            │    │
│  │  ├─ password (hashed)                                     │    │
│  │  ├─ subscription ✅                                       │    │
│  │  │  ├─ tier (free/pro/university/enterprise)              │    │
│  │  │  ├─ status (active/suspended/cancelled)                │    │
│  │  │  ├─ stripeCustomerId                                   │    │
│  │  │  ├─ stripeSubscriptionId                               │    │
│  │  │  ├─ startDate, renewalDate                             │    │
│  │  │  └─ paymentMethod                                      │    │
│  │  ├─ limits ✅                                             │    │
│  │  │  ├─ dailySimulations (5/100/1000/-1)                   │    │
│  │  │  ├─ monthlySimulations (50/1000/10000/-1)              │    │
│  │  │  └─ [6 more feature flags]                             │    │
│  │  └─ usageMetrics ✅                                       │    │
│  │     ├─ simulationsUsedToday                               │    │
│  │     ├─ simulationsUsedThisMonth                           │    │
│  │     ├─ moleculesCreatedThisMonth                          │    │
│  │     └─ totalSimulationsAllTime                            │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              Environment Variables                         │    │
│  │                                                             │    │
│  │  ✅ Already set:                                           │    │
│  │  • MONGODB_URI                                             │    │
│  │  • GEMINI_API_KEY                                          │    │
│  │  • JWT_SECRET                                              │    │
│  │                                                             │    │
│  │  ❌ Missing:                                               │    │
│  │  • STRIPE_PUBLISHABLE_KEY                                  │    │
│  │  • STRIPE_SECRET_KEY                                       │    │
│  │  • STRIPE_WEBHOOK_SECRET                                   │    │
│  │  • STRIPE_PRICES (product price IDs)                       │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ REST API
                           │
┌─────────────────────────────────────────────────────────────────────┐
│              External Services                                       │
│                                                                       │
│  ┌────────────────────┐        ┌────────────────────┐              │
│  │   Stripe API       │        │  Google Gemini     │              │
│  │  ──────────────────│        │  ──────────────────│              │
│  │ ✅ Customer API    │        │ ✅ Configured      │              │
│  │ ❌ Subscription    │        │                    │              │
│  │    creation not    │        │ (Analysis work)    │              │
│  │    complete        │        │                    │              │
│  │ ✅ Webhook ready   │        └────────────────────┘              │
│  │                    │                                             │
│  └────────────────────┘                                             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Current: Analysis Request (Without Subscription Checks)
```
┌─────────────────┐
│ AIInsights.tsx  │
│ clicks molecule │
└────────┬────────┘
         │ canAnalyze() [localStorage]
         ▼
    ✅ Allowed (80% of time)
         │
         ▼
┌────────────────────────────┐
│ /api/predictions/analyze   │ ❌ NO AUTH CHECK
│ (POST with prompt)         │ ❌ NO USAGE CHECK
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Gemini API                 │
│ Returns analysis           │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Frontend recordAnalysis()   │
│ [localStorage update only]  │
└────────────────────────────┘

PROBLEM: User can delete localStorage and bypass limits!
PROBLEM: No revenue tracking
```

### Desired: Analysis Request (With Subscription Checks)
```
┌─────────────────┐
│ AIInsights.tsx  │
│ clicks molecule │
└────────┬────────┘
         │ canAnalyze() [from backend sync]
         ▼
    Decision on frontend
         │
    ┌────┴──────────┐
    │               │
    ▼               ▼
 Allowed        Limit Exceeded
    │               │
    │               ▼
    │         ┌─────────────┐
    │         │ UpgradePrompt│
    │         │ (show modal) │
    │         └─────────────┘
    │
    ▼
┌──────────────────────────────────┐
│ /api/predictions/analyze         │ ✅ WITH AUTH
│ (POST + JWT token header)        │ ✅ WITH USAGE CHECK
└────┬───────────────────────────┬─┘
     │ [Check JWT token]         │
     ▼ [Load user from DB]       │
┌──────────────────────┐         │
│ Verify subscription  │         │
│ Check daily limit    │         │
└────────┬─────────────┘         │
    Pass   │                     │
         │ Fail ────────────────►│ 403 Forbidden
         ▼                       │
┌──────────────────────────────────┐
│ Gemini API                       │
│ Returns analysis                 │
└────┬───────────────────────────┬─┘
     │                           │
     ▼                           │
┌──────────────────────────────────┐ ❌ Error
│ Increment user.usageMetrics      │ ──────►│ Return error
│ • simulationsUsedToday += 1      │        │ with remaining quota
│ • simulationsUsedThisMonth += 1  │        │
│ save to database ✅              │        │
└────────┬───────────────────────────┘       │
         │                                   │
         ▼                                   │
┌──────────────────────────────────┐        │
│ Return analysis with:            │        │
│ • analysis text                  │        │
│ • remainingDaily                 │        │
│ • remainingMonthly               │        │
│ ✅ Revenue tracked!              │        │
└─────────────────────────────────┘        │
                                            │
                                    ┌──────┴──────┐
                                    │ Return to   │
                                    │ frontend    │
                                    └─────────────┘

BENEFIT: Reliable quota enforcement
BENEFIT: Revenue can't be bypassed
```

### Payment Flow (Currently Incomplete)
```
┌──────────────────┐
│ Pricing Page     │
│ Click "Upgrade"  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Payment Modal Opens              │
│ (Stripe CardElement)             │
└────────┬─────────────────────────┘
         │ User enters card details
         │ 4242 4242 4242 4242
         ▼
┌──────────────────────────────────┐
│ PaymentForm.handleSubmit()        │
│ createPaymentMethod(card)        │
└────────┬─────────────────────────┘
         │ paymentMethodId
         ▼
┌──────────────────────────────────┐
│ POST /api/subscription/upgrade    │
│ {                                │
│   newTier: "student",            │
│   paymentMethodId: "pm_xxxxx"    │
│ }                                │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Backend: Create Stripe customer  │ ✅ Works
├──────────────────────────────────┤
│ Backend: Create subscription      │ ❌ INCOMPLETE
│                                  │ • No Stripe API call
│                                  │ • No price ID used
│                                  │ • No charge attempted
│                                  │ • No payment confirmation
├──────────────────────────────────┤
│ Backend: Update user in DB       │ ✅ Works (but payment failed)
│ • subscription.tier = "student"  │
│ • subscription.status = "active" │
└────────┬─────────────────────────┘
         │
         ▼ ❌ ERROR: No actual charge!
┌──────────────────────────────────┐
│ Frontend: Show success (FALSE)    │
│ No money actually charged         │
└──────────────────────────────────┘

PROBLEM: Users get free upgrades!
```

---

## Integration Checklist

### Frontend ✅ 80% Complete
- [x] SubscriptionContext created with 5 tiers
- [x] localStorage persistence
- [x] canAnalyze() logic
- [x] recordAnalysis() logic
- [x] UpgradePrompt component
- [x] Pricing page with all tiers
- [x] AIInsights hooks integrated
- [x] Navbar shows tier badge
- [ ] ⏳ Sync with backend subscription/current
- [ ] ⏳ Connect Stripe payment library
- [ ] ⏳ Create PaymentForm component
- [ ] ⏳ Payment modal in Pricing page

### Backend ✅ 70% Complete
- [x] User model with subscription fields
- [x] /api/subscription/current endpoint
- [x] /api/subscription/upgrade endpoint (partial)
- [x] /api/subscription/tiers endpoint
- [x] /api/subscription/usage endpoint
- [x] /api/webhooks/webhook handler
- [x] Stripe customer creation
- [ ] ⏳ Stripe subscription creation (actual charge)
- [ ] ⏳ Add auth to /api/predictions/analyze
- [ ] ⏳ Add usage recording to /api/predictions/analyze
- [ ] ⏳ Test webhook event handling

### Stripe Setup ❌ 0% Complete
- [ ] Create Stripe account
- [ ] Create products in Stripe Dashboard
- [ ] Create price IDs for each tier
- [ ] Add API keys to backend .env
- [ ] Test card payments
- [ ] Configure webhook endpoint

---

## Revenue Flow

```
┌─────────────────────────────┐
│ User Upgrades to Pro        │
│ Clicks "Upgrade" button     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Payment submitted to Stripe │
│ (currently NOT happening)   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Stripe charges card         │
│ $3.99 (Student Pro)         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Webhook: payment_succeeded  │
│ Backend updates DB          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ User can now:               │
│ • 100-200 analyses/day      │
│ • Export results            │
│ • What-If Chemist tool      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Monthly revenue:            │
│ $3.99 per Student user      │
│ $15.99 per Researcher       │
│ $299.99 per University      │
│ $499.99 per Enterprise      │
└─────────────────────────────┘
```

---

## What's Working vs What's Missing

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Subscription tiers defined | ✅ | SubscriptionContext.tsx | 5 tiers complete |
| Trial mode (50 free) | ✅ | Frontend only | Not enforced on backend |
| Daily/monthly limits | ✅ | Frontend only | No backend validation |
| User model with subscription | ✅ | backend/models/User.js | All fields present |
| API endpoints | ✅ | backend/src/routes/subscription.js | GET /current, GET /tiers, POST /upgrade |
| Stripe customer creation | ✅ | subscription.js POST /upgrade | Works partially |
| Stripe subscription creation | ❌ | subscription.js POST /upgrade | NOT COMPLETE - missing charge |
| Payment form UI | ❌ | Frontend | Need to create |
| Pricing page | ✅ | src/pages/Pricing.tsx | Shows all tiers |
| Auth middleware | ✅ | backend/middleware/auth.js | Has checkUsageQuota |
| Usage enforcement | ❌ | /api/predictions/analyze | Not yet applied |
| Usage recording | ❌ | Backend | No endpoint increments metrics |
| Frontend-backend sync | ❌ | SubscriptionContext | Uses localStorage only |
| Webhook handler | ✅ | backend/src/routes/webhooks.js | Ready but untested |

---

## Summary

**What's Ready to Generate Revenue:**
- ✅ All database structures
- ✅ All API endpoints (partial)
- ✅ Stripe infrastructure
- ✅ Frontend UI/UX

**What's Blocking Payments:**
1. ❌ Stripe subscription creation not implemented
2. ❌ Payment form component not created
3. ❌ Backend not enforcing usage limits
4. ❌ Frontend not syncing with backend
5. ❌ Analysis endpoint not authenticated

**Time to Full Integration:**
- Stripe setup: 30 minutes
- Fix backend payment: 1 hour
- Create payment form: 1 hour
- Frontend sync: 1 hour
- Testing: 2 hours

**Total: ~5-6 hours to real payments**

See `PAYMENT_QUICK_START.md` for step-by-step implementation!
