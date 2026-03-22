# Vitalis AI Backend - Setup Guide (Updated)

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Authentication Setup](#authentication-setup)
6. [Stripe Integration](#stripe-integration)
7. [Running the Server](#running-the-server)
8. [Testing Endpoints](#testing-endpoints)
9. [Production Checklist](#production-checklist)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with configuration
cp .env.example .env

# 3. Update .env with your keys

# 4. Start the server
npm start

# 5. Server runs on http://localhost:5000
```

---

## Prerequisites

- **Node.js** v16+ (https://nodejs.org/)
- **MongoDB Atlas** account (free tier) (https://www.mongodb.com/cloud/atlas)
- **Google Gemini API** key (free) (https://aistudio.google.com/apikey)
- **Stripe Account** for payments (https://stripe.com)
- **Email Service** (Gmail, SendGrid, etc.)

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd vitalis-ai/backend
```

### 2. Install Dependencies

```bash
npm install
```

**Key Dependencies:**
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `stripe` - Payment processing
- `nodemailer` - Email sending
- `axios` - HTTP requests
- `joi` - Input validation

### 3. Create Environment File

```bash
cp .env.example .env
```

---

## Configuration

### 1. MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user with password
4. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`

### 2. Google Gemini API

1. Visit https://aistudio.google.com/apikey
2. Create API key
3. Copy to `GEMINI_API_KEY` in `.env`

### 3. Stripe Setup

1. Create account at https://stripe.com
2. Get API keys from Dashboard → Developers → API Keys
3. Copy `pk_live_*` (public) and `sk_live_*` (secret) keys

**For Testing:**
Use test keys (`pk_test_*` and `sk_test_*`) during development

4. Setup webhook endpoint:
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/webhook`
   - Select events: `customer.subscription.`, `invoice.payment_`, `charge.dispute.`
   - Copy signing secret (`whsec_*`)

### 4. Email Service Setup

#### Option A: Gmail (Development)

1. Enable 2-factor authentication on Gmail
2. Create app-specific password: https://myaccount.google.com/apppasswords
3. Update `.env`:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

#### Option B: SendGrid (Production)

1. Create account at https://sendgrid.com
2. Get API key from Settings → API Keys
3. Update `.env`:
   ```env
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.xxxxx...
   ```

#### Option C: Nodemailer (Custom SMTP)

```env
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
```

---

## Authentication Setup

### 1. JWT Configuration

Update `JWT_SECRET` in `.env` with a strong random string:

```bash
# Generate a secure secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output to `.env`:
```env
JWT_SECRET=your-generated-secret-here
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
```

### 2. Password Requirements

Default validation (can be customized in `auth.js`):
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (`!@#$%^&*`)

### 3. Email Verification

- Verification tokens expire in 24 hours
- Optional: Make email verification required for signup
- Configure in `auth.js` route

### 4. Password Reset

- Reset tokens expire in 24 hours
- User receives reset link via email
- Configure reset link in `EmailService.js`

---

## Stripe Integration

### 1. Initialize Stripe

Stripe is automatically initialized in `subscription.js`:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```

### 2. Create Stripe Customers

When user upgrades subscription:
```javascript
const customer = await stripe.customers.create({
  email: user.email,
  name: `${user.firstName} ${user.lastName}`,
  metadata: { userId: user._id.toString() }
});
```

### 3. Create Subscriptions

```javascript
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: 'price_xxxxx' }],
  payment_behavior: 'default_incomplete'
});
```

### 4. Webhook Verification

Stripe webhooks are verified with signing secret:

```javascript
event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

---

## Running the Server

### Development Mode

```bash
npm run dev
```

With auto-restart on file changes (requires nodemon):
```bash
npm install -D nodemon
npm run dev
```

### Production Mode

```bash
npm start
```

### Expected Output

```
✓ MongoDB connected
✓ Email service verified
🚀 Vitalis AI Backend running on http://localhost:5000
📊 API Documentation: http://localhost:5000/api/docs
🔍 Health Check: http://localhost:5000/api/health
```

---

## Testing Endpoints

### 1. Health Check

```bash
curl http://localhost:5000/api/health
```

### 2. Sign Up

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

Save the `accessToken` from response.

### 4. Get Current User

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Get Subscription Tiers

```bash
curl http://localhost:5000/api/subscription/tiers
```

### 6. Get Current Subscription

```bash
curl -X GET http://localhost:5000/api/subscription/current \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Get Usage

```bash
curl -X GET http://localhost:5000/api/subscription/usage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 8. Create Molecule (Protected)

```bash
curl -X POST http://localhost:5000/api/molecules \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aspirin",
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "description": "Common pain reliever"
  }'
```

---

## Using Postman

### Import Collection

1. Open Postman
2. File → Import
3. Choose `postman_collection.json`
4. Collections automatically populate with all endpoints

### Setup Variables

In Postman environment:
```
{
  "baseUrl": "http://localhost:5000",
  "accessToken": "{{TOKEN_FROM_LOGIN}}",
  "refreshToken": "{{REFRESH_TOKEN}}"
}
```

### Auto-save Token

In signup/login request, add post-test script:
```javascript
var json = pm.response.json();
pm.environment.set("accessToken", json.tokens.accessToken);
pm.environment.set("refreshToken", json.tokens.refreshToken);
```

---

## Troubleshooting

### MongoDB Connection Error

```
✗ MongoDB connection error: connect ENOTFOUND cluster0.mongodb.net
```

**Solution:**
1. Check MONGODB_URI in `.env`
2. Whitelist your IP in MongoDB Atlas
3. Verify username/password
4. Check network connectivity

### Email Service Not Configured

```
⚠️  Email service not configured
   Emails will be logged to console instead
```

**Solution:**
1. Complete email service setup (see Configuration)
2. Update EMAIL_SERVICE and credentials in `.env`
3. Restart server

### Stripe Keys Invalid

```
Error: Invalid API Key provided
```

**Solution:**
1. Get keys from Stripe Dashboard (test or live)
2. Copy full key to STRIPE_SECRET_KEY
3. Ensure no extra spaces in `.env`

### JWT Token Errors

```
401 Unauthorized: Invalid or expired token
```

**Solution:**
1. Check token hasn't expired (24h)
2. Use refresh endpoint to get new token
3. Verify JWT_SECRET is same on all instances

---

## Production Checklist

### Security

- [ ] Change JWT_SECRET to random 32+ char string
- [ ] Use HTTPS only (set `NODE_ENV=production`)
- [ ] Enable CORS restrictions
- [ ] Set secure cookie flags
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting
- [ ] Setup firewall rules
- [ ] Enable MongoDB authentication
- [ ] Rotate API keys regularly

### Performance

- [ ] Enable MongoDB connection pooling
- [ ] Setup Redis for caching
- [ ] Configure CDN for static assets
- [ ] Setup database backups
- [ ] Monitor API response times
- [ ] Setup error tracking (Sentry)
- [ ] Load test before launch

### Monitoring

- [ ] Setup uptime monitoring
- [ ] Configure error alerts
- [ ] Monitor payment failures
- [ ] Track user signup rates
- [ ] Monitor email delivery
- [ ] Setup database monitoring
- [ ] Configure log aggregation

### Compliance

- [ ] Setup terms of service
- [ ] Create privacy policy
- [ ] Enable GDPR compliance
- [ ] Document data retention
- [ ] Setup audit logging
- [ ] Enable 2FA for admin accounts
- [ ] Implement rate limiting

### Deployment

- [ ] Setup CI/CD pipeline
- [ ] Configure auto-scaling
- [ ] Setup staging environment
- [ ] Create deployment runbooks
- [ ] Setup database migrations
- [ ] Configure secrets management
- [ ] Test disaster recovery

---

## File Structure

```
backend/
├── src/
│   ├── index.js                 # Main server
│   ├── models/
│   │   ├── User.js              # User model + auth methods
│   │   ├── Molecule.js
│   │   ├── Prediction.js
│   │   └── Simulation.js
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   ├── subscription.js      # Subscription endpoints
│   │   ├── webhooks.js          # Stripe webhooks
│   │   ├── molecules.js
│   │   ├── predictions.js
│   │   ├── pubchem.js
│   │   └── simulations.js
│   ├── middleware/
│   │   └── auth.js              # Auth + usage middleware
│   ├── services/
│   │   ├── AIPredictionService.js
│   │   ├── ExternalDataService.js
│   │   └── EmailService.js      # Email notifications
│   └── lib/
│       └── utils.js
├── .env                         # Environment variables
├── .env.example                 # Example env file
├── package.json
├── AUTHENTICATION_API.md        # Auth API docs
├── API_DOCUMENTATION.md         # Full API docs
├── SETUP_GUIDE.md              # This file
└── README.md
```

---

## Next Steps

1. Complete `.env` configuration
2. Test authentication endpoints (see Testing)
3. Setup Stripe webhook
4. Configure email service
5. Run database seed script (optional)
6. Deploy to staging environment
7. Load test and optimize
8. Deploy to production

---

## Support & Resources

- **MongoDB**: https://docs.mongodb.com/
- **Stripe Docs**: https://stripe.com/docs
- **JWT.io**: https://jwt.io/
- **Express.js**: https://expressjs.com/
- **Mongoose**: https://mongoosejs.com/

---

**Version:** 1.0 (with Authentication & Subscriptions)  
**Last Updated:** March 2024
