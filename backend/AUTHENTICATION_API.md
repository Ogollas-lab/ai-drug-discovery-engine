# Authentication & Subscription API Documentation

## Overview

Vitalis AI uses JWT-based authentication with role-based subscription tiers to manage access and usage limits.

### Authentication Flow

```
User Signs Up → Email Verification → Login → Tokens Generated
                                      ↓
                            Access Token (24h)
                            Refresh Token (7d)
```

---

## 1. Authentication Endpoints

### 1.1 Sign Up

Create a new user account.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "email": "researcher@university.edu",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "organizationName": "Harvard Medical School"
}
```

**Validation Rules:**
- Email: Valid email format, unique
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- FirstName: 1-50 characters
- LastName: 1-50 characters

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "_id": "65f3c8d9e1a2b3c4d5e6f7g8",
    "email": "researcher@university.edu",
    "firstName": "Jane",
    "lastName": "Smith",
    "organizationName": "Harvard Medical School",
    "subscription": {
      "tier": "free",
      "status": "active"
    }
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input format
- `409 Conflict`: Email already registered

---

### 1.2 Login

Authenticate user and receive tokens.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "researcher@university.edu",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "65f3c8d9e1a2b3c4d5e6f7g8",
    "email": "researcher@university.edu",
    "firstName": "Jane",
    "subscription": {
      "tier": "pro",
      "status": "active"
    }
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  },
  "lastLogin": "2024-03-20T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `404 Not Found`: User not found

---

### 1.3 Refresh Access Token

Get a new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Headers:**
```
Authorization: Bearer {refreshToken}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

---

### 1.4 Verify Email

Mark email as verified using verification token.

**Endpoint:** `POST /api/auth/verify-email`

**Request Body:**
```json
{
  "token": "emailVerificationToken123..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 1.5 Forgot Password

Request a password reset token.

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "researcher@university.edu"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent",
  "note": "Check your email for reset instructions"
}
```

**Development Note:**
In development mode, reset tokens are logged to console.

---

### 1.6 Reset Password

Reset password using reset token.

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "resetToken123...",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### 1.7 Get Current User

Retrieve authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "65f3c8d9e1a2b3c4d5e6f7g8",
    "email": "researcher@university.edu",
    "firstName": "Jane",
    "lastName": "Smith",
    "organizationName": "Harvard Medical School",
    "emailVerified": true,
    "subscription": {
      "tier": "pro",
      "status": "active",
      "currentPeriodEnd": "2024-04-20T10:30:00Z",
      "autoRenew": true,
      "lastPaymentDate": "2024-03-20T10:30:00Z"
    },
    "createdAt": "2024-03-01T00:00:00Z",
    "lastLogin": "2024-03-20T10:30:00Z"
  }
}
```

---

### 1.8 Update Profile

Update user profile information.

**Endpoint:** `PUT /api/auth/profile`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "organizationName": "Harvard Medical School",
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "newsletter": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "firstName": "Jane",
    "lastName": "Smith",
    "organizationName": "Harvard Medical School"
  }
}
```

---

### 1.9 Logout

Invalidate current session.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. Subscription Endpoints

### 2.1 Get All Tiers

Retrieve all subscription tier configurations.

**Endpoint:** `GET /api/subscription/tiers`

**Authentication:** Optional

**Response (200):**
```json
{
  "success": true,
  "tiers": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "billingPeriod": "month",
      "features": [
        "5 simulations per day",
        "50 simulations per month",
        "Basic molecule analysis",
        "Community support"
      ],
      "limits": {
        "dailySimulations": 5,
        "monthlySimulations": 50,
        "moleculesPerMonth": 100,
        "apiRequests": 1000
      }
    },
    {
      "id": "pro",
      "name": "Professional",
      "price": 9.99,
      "currency": "USD",
      "billingPeriod": "month",
      "features": [
        "Unlimited simulations",
        "Advanced predictions",
        "What-If Chemist tool",
        "Real datasets access",
        "Email support"
      ],
      "limits": {
        "dailySimulations": -1,
        "monthlySimulations": -1,
        "moleculesPerMonth": -1,
        "apiRequests": -1
      }
    },
    {
      "id": "university",
      "name": "University",
      "price": 299.99,
      "currency": "USD",
      "billingPeriod": "month",
      "features": [
        "Everything in Pro",
        "API access",
        "Batch processing",
        "Up to 50 team members",
        "Priority support"
      ],
      "limits": {
        "teamMembers": 50
      }
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "price": "Custom",
      "currency": "USD",
      "billingPeriod": "month",
      "features": [
        "Everything + unlimited team members",
        "Batch processing",
        "Dedicated support",
        "Custom integrations",
        "SLA agreement"
      ],
      "limits": {
        "teamMembers": -1
      }
    }
  ]
}
```

---

### 2.2 Get Current Subscription

Get user's current subscription and limits.

**Endpoint:** `GET /api/subscription/current`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "status": "active",
    "currentPeriodEnd": "2024-04-20T10:30:00Z",
    "autoRenew": true,
    "lastPaymentDate": "2024-03-20T10:30:00Z",
    "lastPaymentAmount": "9.99"
  },
  "limits": {
    "dailySimulations": -1,
    "monthlySimulations": -1,
    "moleculesPerMonth": -1,
    "teamMembers": 1,
    "apiRequests": -1
  },
  "features": {
    "whatIfChemist": true,
    "advancedPredictions": true,
    "realDatasets": true,
    "apiAccess": false,
    "batchProcessing": false
  }
}
```

---

### 2.3 Upgrade Subscription

Upgrade to a higher tier.

**Endpoint:** `POST /api/subscription/upgrade`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "tier": "pro",
  "paymentMethod": "pm_1234567890abcdef"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Subscription upgraded successfully",
  "subscription": {
    "tier": "pro",
    "status": "active",
    "currentPeriodEnd": "2024-04-20T10:30:00Z",
    "stripeSubscriptionId": "sub_1234567890abcdef"
  },
  "confirmationEmail": "sent to researcher@university.edu"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid tier or payment method
- `402 Payment Required`: Payment failed
- `409 Conflict`: Already on requested tier

---

### 2.4 Cancel Subscription

Cancel subscription and downgrade to free tier.

**Endpoint:** `POST /api/subscription/cancel`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "reason": "Switching to competitor"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "subscription": {
    "tier": "free",
    "status": "cancelled",
    "cancellationDate": "2024-03-20T10:30:00Z"
  },
  "confirmationEmail": "sent to researcher@university.edu"
}
```

---

### 2.5 Get Usage Metrics

Get detailed usage statistics.

**Endpoint:** `GET /api/subscription/usage`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "usage": {
    "simulations": {
      "daily": {
        "used": 3,
        "limit": 5,
        "remaining": 2,
        "percentageUsed": 60,
        "resetAt": "2024-03-21T00:00:00Z"
      },
      "monthly": {
        "used": 42,
        "limit": 50,
        "remaining": 8,
        "percentageUsed": 84,
        "resetAt": "2024-04-01T00:00:00Z"
      }
    },
    "molecules": {
      "monthly": {
        "used": 67,
        "limit": 100,
        "remaining": 33,
        "percentageUsed": 67,
        "resetAt": "2024-04-01T00:00:00Z"
      }
    },
    "apiRequests": {
      "monthly": {
        "used": 8543,
        "limit": 10000,
        "remaining": 1457,
        "percentageUsed": 85.43
      }
    }
  },
  "warnings": [
    {
      "type": "approaching_limit",
      "resource": "monthlySimulations",
      "percentageUsed": 84
    }
  ]
}
```

---

### 2.6 Get Tier Features

Get feature availability for user's tier.

**Endpoint:** `GET /api/subscription/features`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "tier": "pro",
  "features": {
    "whatIfChemist": {
      "available": true,
      "description": "Interactive molecular design tool"
    },
    "advancedPredictions": {
      "available": true,
      "description": "Gemini-powered AI predictions"
    },
    "realDatasets": {
      "available": true,
      "description": "Access to ChEMBL and PubChem data"
    },
    "apiAccess": {
      "available": false,
      "description": "RESTful API access",
      "requiredTier": "university"
    },
    "batchProcessing": {
      "available": false,
      "description": "Batch molecule processing",
      "requiredTier": "university"
    },
    "teamManagement": {
      "available": false,
      "description": "Manage team members",
      "requiredTier": "university"
    }
  }
}
```

---

## 3. Team Management Endpoints

### 3.1 Invite Team Member

Send invitation to join team.

**Endpoint:** `POST /api/subscription/team/invite`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "email": "colleague@university.edu",
  "role": "researcher"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "invitation": {
    "_id": "inv_1234567890abcdef",
    "email": "colleague@university.edu",
    "role": "researcher",
    "status": "pending",
    "expiresAt": "2024-03-27T10:30:00Z"
  }
}
```

**Error Responses:**
- `403 Forbidden`: Team member limit reached
- `400 Bad Request`: Invalid email

---

### 3.2 Get Team Members

Get list of team members and pending invitations.

**Endpoint:** `GET /api/subscription/team`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "team": {
    "members": [
      {
        "userId": "65f3c8d9e1a2b3c4d5e6f7g8",
        "email": "researcher@university.edu",
        "name": "Jane Smith",
        "role": "admin",
        "joinedAt": "2024-03-01T00:00:00Z"
      }
    ],
    "invitations": [
      {
        "invitationId": "inv_1234567890abcdef",
        "email": "colleague@university.edu",
        "role": "researcher",
        "status": "pending",
        "sentAt": "2024-03-20T10:30:00Z",
        "expiresAt": "2024-03-27T10:30:00Z"
      }
    ],
    "totalMembers": 1,
    "maxMembers": 50
  }
}
```

---

## 4. Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": "Additional context"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_INPUT` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `QUOTA_EXCEEDED` | 429 | Usage limit exceeded |
| `PAYMENT_REQUIRED` | 402 | Payment failed or required |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 5. Authentication Headers

All authenticated requests must include:

```
Authorization: Bearer {accessToken}
```

Token expiry: 24 hours
Refresh token expiry: 7 days

---

## 6. Rate Limiting

### API Rate Limits by Tier

| Tier | Requests/Hour | Requests/Day |
|------|---------------|--------------|
| Free | 100 | 1,000 |
| Pro | 1,000 | 10,000 |
| University | 5,000 | 50,000 |
| Enterprise | Unlimited | Unlimited |

---

## 7. Webhook Events

Stripe webhooks are sent to `POST /api/webhooks/webhook` with signature verification.

### Handled Events

- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed
- `charge.dispute.created` - Chargeback dispute

---

## 8. Code Examples

### JavaScript/Node.js

```javascript
// Sign up
const signupResponse = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John'
  })
});

const { tokens } = await signupResponse.json();
localStorage.setItem('accessToken', tokens.accessToken);

// Make authenticated request
const response = await fetch('/api/subscription/current', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  }
});
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'http://localhost:5000/api/subscription/current',
    headers=headers
)

subscription = response.json()
```

### cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Get subscription (using returned token)
curl -X GET http://localhost:5000/api/subscription/current \
  -H "Authorization: Bearer {accessToken}"
```

---

## 9. Environment Variables

Required for authentication and subscriptions:

```env
# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Stripe
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@vitalis-ai.com

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## 10. Testing Subscription Features

### Test Stripe Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 0119` | Requires authentication |

---

## 11. Migration & Onboarding

### Free Trial (Optional)

To offer free trials, add to subscription model:

```javascript
{
  tier: 'pro',
  status: 'trial',
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  trialTrialDaysRemaining: 14
}
```

### Migrating Existing Users

```javascript
// Add to user migration script
db.users.updateMany(
  { subscription: { $exists: false } },
  { $set: { 'subscription.tier': 'free', 'subscription.status': 'active' } }
);
```

---

**API Version:** 1.0  
**Last Updated:** March 2024  
**Next Review:** June 2024
