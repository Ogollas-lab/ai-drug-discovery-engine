# Quick Testing Checklist

## Before Testing
```bash
# Backend syntax check
node -c backend/src/models/User.js
node -c backend/src/routes/subscription.js

# Frontend build
npm run build
```

## Test Scenarios

### ✅ Scenario 1: New Account - No Prompt on First Analyses
```
1. Create new account
2. Go to Workspace
3. Select a molecule
4. Click Analyze 1x → ✅ Works, no prompt
5. Click Analyze 19 more times → ✅ Works, no prompt (total: 20)
Expected: 0 prompts shown so far
```

### ✅ Scenario 2: Limit Hit - Prompt Appears
```
1. (Continuing from above) 
2. Click Analyze again (21st time) → ✅ Prompt appears
Expected message: "Daily Limit Reached (20/day)"
Buttons: "Dismiss" and "Upgrade Now"
```

### ✅ Scenario 3: Dismiss Works
```
1. (Prompt is visible)
2. Click "Dismiss" button → ✅ Prompt closes
3. Try to analyze again → ✅ Prompt reappears (same molecule)
Expected: User can dismiss but still can't analyze more today
```

### ✅ Scenario 4: Backend Persistence
```
1. Analyze 10 molecules
2. Open browser DevTools → Application → Storage → analysesUsedToday
Expected: Shows 10 in localStorage
3. Check backend (if logged in):
   - POST to /api/subscription/current should return analysesUsedToday: 10
```

### ✅ Scenario 5: Daily Reset (Tomorrow)
```
1. Use all 20 daily analyses
2. Dismiss prompt
3. Wait until midnight or manually test:
   - Reset lastResetDate in localStorage to yesterday
   - Refresh page
Expected: analysesUsedToday resets to 0, can analyze 20 more
```

### ✅ Scenario 6: Upgrade Tier
```
1. With 20/20 analyses used
2. Click "Upgrade Now" → Goes to pricing
3. If you upgrade tier:
   - analysesUsedToday resets to 0
   - New tier limit applies (e.g., 200/day for Student)
   - dismissedUpgradePrompt clears (prompt shows again if hit new limit)
```

## Browser DevTools Checks

### Check Storage
```javascript
// View current subscription in localStorage
JSON.parse(localStorage.getItem('vitalis_subscription'))

// Should see:
{
  tier: "free",
  analysesUsedToday: <number>,
  analysesUsedThisMonth: <number>,
  lastResetDate: "2026-03-19",
  isTrialActive: false,
  dismissedUpgradePrompt: true/false
}
```

### Check Console for Logs
```
// Should see sync messages:
"📤 Syncing subscription usage to backend"
"✅ Subscription synced to backend"

// If backend unavailable:
"⚠️ Failed to sync subscription to backend: ..."
// Falls back to localStorage
```

## Backend API Testing (curl)

```bash
# Get current subscription (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/subscription/current

# Expected response:
{
  "success": true,
  "tier": "free",
  "analysesUsedToday": 10,
  "analysesUsedThisMonth": 15,
  "lastResetDate": "2026-03-19",
  "isTrialActive": true,
  "dismissedUpgradePrompt": false
}

# Update usage
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"analysesUsedToday": 11, "analysesUsedThisMonth": 16, "lastResetDate": "2026-03-19"}' \
  http://localhost:5000/api/subscription/usage

# Reset daily counter
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/subscription/reset-daily
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Prompt shows on first analysis | `canAnalyze()` returning false | Check daily limit is 20 for free tier |
| Prompt doesn't dismiss | `dismissUpgradePrompt()` not called | Check UpgradePrompt has dismiss handler |
| Counter doesn't reset at midnight | `lastResetDate` not being checked | Check SubscriptionContext useEffect |
| Backend sync fails | Missing auth token | Login required, check token in localStorage |
| "User not found" errors | User ID mismatch | Check auth token is valid |

## Success Criteria

- [ ] ✅ New user can analyze 20 times before seeing prompt
- [ ] ✅ Prompt shows after 21st analysis attempt
- [ ] ✅ Dismiss button removes prompt from screen
- [ ] ✅ Counter persists after browser refresh
- [ ] ✅ Counter resets daily
- [ ] ✅ Backend stores data in MongoDB
- [ ] ✅ No errors in console
- [ ] ✅ Build succeeds without warnings

## Debug Mode

Enable extra logging by adding to SubscriptionContext:
```typescript
// After sync
console.log('📊 Subscription state:', subscription);
console.log('📈 Can analyze:', canAnalyze());
console.log('⏳ Analyses remaining:', getAnalysesRemaining());
```
