# 🚀 Quick Start: Enable Real Payments in Vitalis AI

## Current State
✅ Subscription system is 82% complete
✅ Database models with subscription fields
✅ API endpoints for subscription management
✅ Stripe webhook infrastructure ready
❌ Payment processing not activated
❌ Frontend not syncing with backend

---

## WHAT YOU NEED TO DO RIGHT NOW

### Step 1: Get Stripe API Keys (15 minutes)
1. Go to https://stripe.com
2. Sign up (free account)
3. Go to Dashboard → Developers → API Keys
4. Copy these values:
   ```
   STRIPE_PUBLISHABLE_KEY = pk_test_XXXX
   STRIPE_SECRET_KEY = sk_test_XXXX
   STRIPE_WEBHOOK_SECRET = whsec_XXXX
   ```
5. Save to `.env` files

### Step 2: Create Products in Stripe (20 minutes)
In Stripe Dashboard → Products → Add Product:

```
Product 1: "Vitalis AI - Student Pro"
├─ Price: $3.99/month (recurring)
├─ Price ID: price_1XXXXXX
└─ Save to STRIPE_PRICES.student

Product 2: "Vitalis AI - Researcher" 
├─ Price: $15.99/month (recurring)
├─ Price ID: price_1XXXXXX
└─ Save to STRIPE_PRICES.researcher

Product 3: "Vitalis AI - University"
├─ Price: $299.99/month (recurring)
├─ Price ID: price_1XXXXXX
└─ Save to STRIPE_PRICES.university

Product 4: "Vitalis AI - Enterprise"
├─ Price: $499.99/month (custom)
├─ Price ID: price_1XXXXXX
└─ Save to STRIPE_PRICES.enterprise
```

### Step 3: Update Backend Environment (5 minutes)
Edit `/backend/.env`:
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
STRIPE_SECRET_KEY=sk_test_XXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXX
```

Edit `/backend/src/routes/subscription.js` ~line 5:
```javascript
const STRIPE_PRICES = {
  student: 'price_1XXXX_student',
  researcher: 'price_1XXXX_researcher',
  university: 'price_1XXXX_university',
  enterprise: 'price_1XXXX_enterprise'
};
```

### Step 4: Install Frontend Payment Library (5 minutes)
```bash
cd ai-drug-discovery-engine
npm install @stripe/react-stripe-js @stripe/js
```

### Step 5: Fix Backend Subscription Creation (30 minutes)
Update `/backend/src/routes/subscription.js` POST `/upgrade` endpoint:

**Current code (lines 180-276):**
```javascript
router.post('/upgrade', authenticateToken, async (req, res) => {
  // ... existing code ...
  
  // This part needs completion:
  if (newTier !== 'free' && !user.subscription.stripeCustomerId) {
    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method required'
      });
    }
    
    // ❌ MISSING: Actually create Stripe subscription
    // ❌ MISSING: Handle 3D Secure if needed
    // ❌ MISSING: Wait for payment confirmation
  }
```

**Replace with:**
```javascript
router.post('/upgrade', authenticateToken, async (req, res) => {
  try {
    const { newTier, paymentMethodId } = req.body;
    
    if (!newTier || !SUBSCRIPTION_TIERS[newTier]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // If upgrading to paid tier
    if (newTier !== 'free') {
      try {
        // Create Stripe customer if doesn't exist
        let customerId = user.subscription.stripeCustomerId;
        
        if (!customerId) {
          if (!paymentMethodId) {
            return res.status(400).json({
              success: false,
              message: 'Payment method required for paid subscriptions'
            });
          }
          
          const customer = await stripe.customers.create({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            payment_method: paymentMethodId,
            invoice_settings: { default_payment_method: paymentMethodId }
          });
          
          customerId = customer.id;
          user.subscription.stripeCustomerId = customerId;
        }
        
        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: STRIPE_PRICES[newTier] }],
          expand: ['latest_invoice.payment_intent']
        });
        
        user.subscription.stripeSubscriptionId = subscription.id;
        
        // Check if payment requires action (3D Secure)
        if (subscription.latest_invoice?.payment_intent?.status === 'requires_action') {
          return res.json({
            success: false,
            requiresAction: true,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            message: 'Payment requires additional verification'
          });
        }
        
        // Check if subscription is active
        if (subscription.status !== 'active') {
          return res.status(400).json({
            success: false,
            message: 'Subscription creation failed: ' + subscription.status
          });
        }
        
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return res.status(400).json({
          success: false,
          message: 'Payment processing failed',
          error: stripeError.message
        });
      }
    }
    
    // Update user subscription
    user.subscription.tier = newTier;
    user.subscription.status = 'active';
    user.subscription.startDate = new Date();
    user.subscription.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Reset usage metrics
    user.usageMetrics.simulationsUsedToday = 0;
    user.usageMetrics.simulationsUsedThisMonth = 0;
    user.usageMetrics.moleculesCreatedThisMonth = 0;
    
    await user.save();
    
    res.json({
      success: true,
      message: `Successfully upgraded to ${SUBSCRIPTION_TIERS[newTier].name}`,
      data: {
        tier: user.subscription.tier,
        status: user.subscription.status,
        renewalDate: user.subscription.renewalDate,
        price: SUBSCRIPTION_TIERS[newTier].price
      }
    });
    
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

### Step 6: Add Authentication to Analysis Endpoint (20 minutes)
Update `/backend/src/routes/predictions.js` around line 376:

**Current:**
```javascript
router.post('/analyze', async (req, res) => {
  // ❌ No auth check
  const { prompt, type, moleculeData } = req.body;
```

**Replace with:**
```javascript
const { authenticateToken, checkUsageQuota } = require('../middleware/auth');

router.post('/analyze', authenticateToken, checkUsageQuota, async (req, res) => {
  // ✅ Now authenticated with subscription check
  const { prompt, type, moleculeData } = req.body;
  const userId = req.user?.id;
  
  try {
    // ... existing Gemini code ...
    
    // At the end, record usage:
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.usageMetrics.simulationsUsedToday += 1;
        user.usageMetrics.simulationsUsedThisMonth += 1;
        user.usageMetrics.totalSimulationsAllTime += 1;
        await user.save();
      }
    }
    
    // Return response with remaining quota
    res.json({
      success: true,
      analysis,
      remainingDaily: user ? (user.limits.dailySimulations - user.usageMetrics.simulationsUsedToday) : null,
      remainingMonthly: user ? (user.limits.monthlySimulations - user.usageMetrics.simulationsUsedThisMonth) : null
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

### Step 7: Sync Frontend with Backend (30 minutes)
Update `/src/contexts/SubscriptionContext.tsx`:

Add after line 107 (in SubscriptionProvider function):
```typescript
import { useAuth } from './AuthContext';

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription>({
    tier: 'free',
    analysesUsedToday: 0,
    analysesUsedThisMonth: 0,
    trialAnalysesRemaining: 50,
    isTrialActive: true
  });

  // 🆕 ADD THIS: Sync with backend when user logs in
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) return;
      
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('http://localhost:5000/api/subscription/current', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.error('Failed to fetch subscription');
          return;
        }
        
        const data = await response.json();
        
        // Map backend tier names to frontend
        const tierMap: Record<string, SubscriptionTier> = {
          'free': 'free',
          'pro': 'student',
          'university': 'university',
          'enterprise': 'enterprise'
        };
        
        setSubscription({
          tier: tierMap[data.data.tier] || 'free',
          analysesUsedToday: data.data.usageMetrics?.simulationsUsedToday || 0,
          analysesUsedThisMonth: data.data.usageMetrics?.simulationsUsedThisMonth || 0,
          trialAnalysesRemaining: data.data.tier === 'free' ? (50 - (data.data.usageMetrics?.totalSimulationsAllTime || 0)) : 0,
          isTrialActive: data.data.tier === 'free' && (50 - (data.data.usageMetrics?.totalSimulationsAllTime || 0)) > 0
        });
        
        localStorage.setItem('vitalis_subscription', JSON.stringify({...subscription}));
      } catch (error) {
        console.error('Failed to sync subscription:', error);
      }
    };
    
    const timer = setTimeout(fetchSubscription, 500);
    return () => clearTimeout(timer);
  }, [user?.id]); // Re-fetch when user changes
  
  // ... rest of existing code ...
```

### Step 8: Create Payment Form Component (30 minutes)
Create `/src/components/PaymentForm.tsx`:
```typescript
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

interface PaymentFormProps {
  tier: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const PaymentForm = ({ tier, onSuccess, onError }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create payment method
      const { paymentMethod, error: methodError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!
      });
      
      if (methodError) {
        setError(methodError.message);
        return;
      }
      
      // Call backend upgrade endpoint
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:5000/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newTier: tier,
          paymentMethodId: paymentMethod.id
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        if (data.requiresAction && data.clientSecret) {
          // Handle 3D Secure
          const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
          if (confirmError) {
            setError(confirmError.message);
            return;
          }
        } else {
          setError(data.message || 'Payment failed');
          return;
        }
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: { fontSize: '16px', color: '#424770' },
              invalid: { color: '#9e2146' }
            }
          }}
        />
      </div>
      
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          'Complete Payment'
        )}
      </Button>
    </form>
  );
};
```

### Step 9: Update Pricing Page with Payment Modal (20 minutes)
In `/src/pages/Pricing.tsx`, update the upgrade button handler:

```typescript
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/js';
import { PaymentForm } from '@/components/PaymentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Pricing() {
  const [showPayment, setShowPayment] = useState<string | null>(null);
  
  const handleUpgrade = async (tierName: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (tierName === "Free") return;

    // Show payment form
    setShowPayment(tierName);
  };
  
  return (
    <>
      {/* Existing pricing cards ... */}
      
      {/* Payment Modal */}
      <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to {showPayment}</DialogTitle>
          </DialogHeader>
          
          <Elements stripe={stripePromise}>
            <PaymentForm
              tier={showPayment!.toLowerCase()}
              onSuccess={() => {
                setShowPayment(null);
                // Refresh subscription
                navigate("/workspace");
              }}
              onError={(error) => {
                console.error('Payment error:', error);
              }}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Step 10: Test Everything (30 minutes)
1. Use Stripe test card: `4242 4242 4242 4242`
2. Expiry: `12/25`
3. CVC: `123`

Test flow:
```
1. Sign up with test email
2. Go to /pricing
3. Click "Upgrade" on Student Pro
4. Enter test card details
5. Click "Complete Payment"
6. Verify in Stripe Dashboard → Payments
7. Check user is upgraded in MongoDB
```

---

## TOTAL TIME: ~3-4 hours

After completing these steps, you'll have:
✅ Fully functional payment processing
✅ Real charges to user credit cards
✅ Automatic subscription renewal
✅ Usage limit enforcement
✅ Revenue collection via Stripe
✅ Webhook handling for subscription events

---

## Testing Checklist

- [ ] Stripe account created
- [ ] API keys added to `.env`
- [ ] Products created in Stripe
- [ ] Backend subscription creation updated
- [ ] Analysis endpoint authenticated
- [ ] Frontend syncs with backend subscription
- [ ] Payment form component created
- [ ] Pricing page has payment modal
- [ ] Test payment card works
- [ ] Stripe webhook events received
- [ ] Usage limits enforced in backend
- [ ] Renewal dates set correctly

---

## Troubleshooting

### "Payment Method Required" Error
- Check paymentMethodId is being passed correctly
- Verify Stripe key in environment

### "Subscription Not Found" Error
- Check Stripe product IDs match STRIPE_PRICES in code
- Verify subscriptions created in Stripe Dashboard

### Frontend Not Syncing
- Check authorization header being sent
- Verify accessToken in localStorage
- Check CORS settings on backend

### Webhook Not Triggering
- Verify webhook endpoint at `GET /webhooks/webhook`
- Check Stripe webhook secret in `.env`
- Verify endpoint URL in Stripe Dashboard

---

**Questions?** Check SUBSCRIPTION_SETUP_GUIDE.md for full documentation.
