# Vitalis AI Authentication & Subscription Implementation Checklist

## Phase 1: Setup & Configuration ✅

### Environment Setup
- [x] Create `.env.example` with all required variables
- [x] Add authentication dependencies to `package.json`:
  - bcryptjs
  - jsonwebtoken
  - nodemailer
  - stripe
- [x] Update `package.json` with all dependencies

### Database Models
- [x] Create `User.js` model with:
  - User profile (email, password, firstName, lastName)
  - Subscription management (tier, status, Stripe IDs)
  - Usage tracking (daily/monthly/all-time metrics)
  - Team management (members, invitations)
  - Authentication methods (password hashing, token generation)

### File Structure Created
- [x] `/src/middleware/auth.js` - Authentication & authorization middleware
- [x] `/src/routes/auth.js` - Authentication endpoints
- [x] `/src/routes/subscription.js` - Subscription management endpoints
- [x] `/src/routes/webhooks.js` - Stripe webhook handlers
- [x] `/src/services/EmailService.js` - Email notification service
- [x] `/test/auth-subscription.test.js` - Integration tests
- [x] `AUTHENTICATION_API.md` - API documentation
- [x] `SETUP_GUIDE_UPDATED.md` - Setup instructions

---

## Phase 2: Configuration & Testing

### Before Running the Server
- [ ] Copy `.env.example` to `.env`
- [ ] Update `.env` with:
  - [ ] `MONGODB_URI` - MongoDB Atlas connection string
  - [ ] `JWT_SECRET` - Generate random 32+ char string
  - [ ] `GEMINI_API_KEY` - Google Gemini API key
  - [ ] `EMAIL_USER` and `EMAIL_PASSWORD` - Gmail or email service
  - [ ] `STRIPE_PUBLIC_KEY` and `STRIPE_SECRET_KEY` - Stripe test keys
  - [ ] `FRONTEND_URL` - Frontend application URL

### Install Dependencies
```bash
npm install
```

**New packages installed:**
- bcryptjs - Password hashing
- jsonwebtoken - JWT token management
- nodemailer - Email service
- stripe - Stripe payment integration

---

## Phase 3: Local Testing

### 1. Start MongoDB
```bash
# If using MongoDB Atlas, URI is in .env
# If using local MongoDB:
mongod
```

### 2. Start Backend Server
```bash
npm start
# or with hot reload:
npm run dev
```

Expected output:
```
✓ MongoDB connected
✓ Email service verified
🚀 Vitalis AI Backend running on http://localhost:5000
📊 API Documentation: http://localhost:5000/api/docs
🔍 Health Check: http://localhost:5000/api/health
```

### 3. Test Authentication Flow

#### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```

Expected: `{ "status": "ok", "mongodb": "connected" }`

#### Test 2: Sign Up
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

Expected: 201 status with `accessToken` and `refreshToken`

#### Test 3: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

Save the `accessToken` for next tests.

#### Test 4: Get Current User
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: User data with subscription tier

#### Test 5: Get Subscription Tiers
```bash
curl http://localhost:5000/api/subscription/tiers
```

Expected: Array of 4 tiers (free, pro, university, enterprise)

#### Test 6: Get Current Subscription
```bash
curl http://localhost:5000/api/subscription/current \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: Current tier (free by default), limits, and features

#### Test 7: Get Usage Metrics
```bash
curl http://localhost:5000/api/subscription/usage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: Usage breakdown for simulations, molecules, etc.

### 4. Run Test Suite
```bash
npm test -- test/auth-subscription.test.js
```

---

## Phase 4: Email Service Setup

### Option A: Gmail (Recommended for Testing)
1. Go to https://myaccount.google.com/apppasswords
2. Generate app password (16 characters)
3. Add to `.env`:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

### Option B: SendGrid (Production)
1. Sign up at https://sendgrid.com
2. Get API key from Settings → API Keys
3. Add to `.env`:
   ```env
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.xxxxx
   ```

### Option C: Development Mode
- Emails are logged to console if service not configured
- Check console output for verification links and reset tokens

---

## Phase 5: Stripe Integration

### Setup Stripe Account
1. Create account at https://stripe.com
2. Get test keys from Dashboard → Developers → API Keys
3. Add to `.env`:
   ```env
   STRIPE_PUBLIC_KEY=pk_test_xxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxx
   ```

### Setup Webhook (Production)
1. Go to Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy signing secret to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Test Stripe Integration
Use these test card numbers:
- `4242 4242 4242 4242` - Successful payment
- `4000 0000 0000 0002` - Declined
- `4000 0000 0000 0119` - Requires authentication

---

## Phase 6: Integration with Existing Routes

### Update Molecule Routes
- [x] Add authentication requirement to `/api/molecules`
- [x] Add usage tracking middleware
- [x] Add quota enforcement
- [x] Update in `src/index.js`

### Update Prediction Routes
- [x] Add authentication requirement
- [x] Add usage tracking for `simulation` action
- [x] Add feature check for advanced predictions
- [x] Update in `src/index.js`

### Update Simulation Routes
- [x] Add authentication requirement
- [x] Add usage tracking and quota enforcement
- [x] Update in `src/index.js`

### Status: All routes updated in `src/index.js` ✅

---

## Phase 7: Frontend Integration

### Frontend Updates Required

#### 1. Login/Signup UI
- [ ] Create signup form component
- [ ] Create login form component
- [ ] Add password strength validation
- [ ] Implement OAuth (optional)

#### 2. Store Tokens
- [ ] Save accessToken to localStorage/sessionStorage
- [ ] Save refreshToken (secure storage)
- [ ] Implement token refresh logic
- [ ] Handle token expiry

#### 3. API Requests
- [ ] Add Authorization header to all API calls
- [ ] Implement token refresh on 401
- [ ] Handle 429 (quota exceeded) errors
- [ ] Add error messages for subscription limits

#### 4. Subscription UI
- [ ] Create subscription tier display
- [ ] Build upgrade/downgrade flow
- [ ] Show usage metrics dashboard
- [ ] Team member management interface

#### 5. Protected Routes
- [ ] Wrap app routes with authentication check
- [ ] Redirect unauthenticated users to login
- [ ] Implement role-based UI visibility
- [ ] Show feature unavailable messages

### Example Frontend Integration

```javascript
// api.js - API wrapper with auth
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });
        localStorage.setItem('accessToken', data.accessToken);
        // Retry original request
        return api(error.config);
      } catch (err) {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 429) {
      // Show quota exceeded error
      alert('You have exceeded your usage limit. Please upgrade your subscription.');
    }
    throw error;
  }
);

export default api;
```

---

## Phase 8: Documentation & Deployment

### Update Documentation
- [x] Create `AUTHENTICATION_API.md` with all endpoints
- [x] Create `SETUP_GUIDE_UPDATED.md` with setup instructions
- [x] Add code examples for signup/login
- [x] Document error codes and responses
- [x] Add Postman collection examples

### Deployment Checklist

#### Pre-Deployment
- [ ] Test all endpoints in staging
- [ ] Load test the system
- [ ] Test email notifications
- [ ] Verify Stripe integration
- [ ] Test subscription upgrades/downgrades
- [ ] Verify webhook signatures
- [ ] Test password reset flow
- [ ] Verify team invitations work

#### Deployment
- [ ] Update environment variables on server
- [ ] Use production Stripe keys
- [ ] Enable HTTPS only
- [ ] Setup SSL certificates
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Setup monitoring and alerts
- [ ] Configure error tracking (Sentry)
- [ ] Setup logging aggregation

#### Post-Deployment
- [ ] Monitor error rates
- [ ] Track user signups
- [ ] Monitor payment processing
- [ ] Check email delivery rates
- [ ] Verify webhook processing
- [ ] Test subscription renewal
- [ ] Monitor database performance
- [ ] Setup automated backups

---

## Phase 9: Advanced Features (Optional)

### OAuth Integration
- [ ] Add Google OAuth
- [ ] Add GitHub OAuth
- [ ] Add Microsoft OAuth
- [ ] Implement SSO

### Advanced Subscription Features
- [ ] Add trial periods (14 days)
- [ ] Implement coupon codes
- [ ] Add monthly to annual discount
- [ ] Setup usage-based pricing

### Admin Dashboard
- [ ] User management interface
- [ ] Subscription analytics
- [ ] Revenue tracking
- [ ] Usage metrics dashboard
- [ ] Team management
- [ ] Payment history

### Analytics & Metrics
- [ ] Track signup funnel
- [ ] Monitor subscription churn
- [ ] Track feature usage
- [ ] Measure API performance
- [ ] User retention metrics

---

## Phase 10: Security Hardening

### Authentication Security
- [ ] Implement rate limiting on login (5 attempts/5 min)
- [ ] Add CAPTCHA on signup (optional)
- [ ] Implement password history
- [ ] Add 2-factor authentication (optional)
- [ ] Implement account lockout after failed attempts

### API Security
- [ ] Enable CORS restrictions
- [ ] Implement CSRF protection
- [ ] Add input validation (joi validation in place)
- [ ] Implement SQL injection prevention
- [ ] Add XSS protection

### Data Security
- [ ] Encrypt sensitive data at rest
- [ ] Enable encryption in transit (HTTPS)
- [ ] Implement data retention policies
- [ ] Add GDPR compliance
- [ ] Setup secure deletion

### Infrastructure Security
- [ ] Enable Web Application Firewall (WAF)
- [ ] Setup DDoS protection
- [ ] Enable security headers
- [ ] Regular security audits
- [ ] Implement intrusion detection

---

## Quick Command Reference

### Development
```bash
npm start          # Start server
npm run dev        # Start with hot reload
npm test           # Run tests
npm test -- test/auth-subscription.test.js  # Run auth tests
```

### Database
```bash
# View MongoDB Atlas:
# https://cloud.mongodb.com/
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Cleanup
```bash
rm -rf node_modules
npm install
```

---

## Testing Checklist

### Authentication
- [ ] Sign up with valid data → creates user + free tier
- [ ] Sign up with duplicate email → 409 conflict
- [ ] Sign up with weak password → validation error
- [ ] Login with correct credentials → returns tokens
- [ ] Login with wrong password → 401 unauthorized
- [ ] Refresh token flow → returns new access token
- [ ] Get profile without auth → 401 error
- [ ] Get profile with valid token → returns user data
- [ ] Password reset flow → email sent + token works

### Subscriptions
- [ ] Free tier has correct limits
- [ ] Can view subscription tiers
- [ ] Can upgrade subscription (with Stripe)
- [ ] Usage tracking increments on API calls
- [ ] Monthly metrics reset on new month
- [ ] Quota enforcement blocks over-limit requests
- [ ] Team invitations work
- [ ] Webhook events process correctly

### Integrations
- [ ] Email verification emails send
- [ ] Password reset emails send
- [ ] Subscription upgrade emails send
- [ ] Stripe webhooks are verified
- [ ] Usage limit warnings work

---

## Known Limitations & TODO

### Current Implementation
- [x] JWT authentication
- [x] 4-tier subscription model
- [x] Usage tracking
- [x] Team member management
- [x] Email notifications
- [x] Stripe webhook handling
- [x] Middleware for auth & quota

### Future Enhancements
- [ ] OAuth/SSO integration
- [ ] 2FA/MFA support
- [ ] Trial periods
- [ ] Coupon codes
- [ ] Usage-based pricing
- [ ] Admin dashboard
- [ ] Advanced analytics
- [ ] API rate limiting per tier

---

## Support & Resources

- **API Docs**: See `AUTHENTICATION_API.md`
- **Setup Guide**: See `SETUP_GUIDE_UPDATED.md`
- **Test Suite**: Run `npm test`
- **Stripe Docs**: https://stripe.com/docs
- **JWT Reference**: https://jwt.io/

---

**Created:** March 2024  
**Last Updated:** March 2024  
**Status:** Ready for Phase 7 (Frontend Integration)
