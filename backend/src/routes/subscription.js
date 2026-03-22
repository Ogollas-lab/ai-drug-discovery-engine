const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('./auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// Subscription tiers configuration
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    description: 'Get started with basic features',
    features: [
      'Limited simulations (5/day)',
      'Basic molecule analysis',
      'Public datasets only',
      'PubChem integration',
      'Community support'
    ],
    limits: {
      dailySimulations: 5,
      monthlySimulations: 50,
      moleculesPerMonth: 20,
      advancedPredictions: false,
      realDatasets: false,
      whatIfChemist: false,
      exportReports: false,
      apiAccess: false,
      batchProcessing: false,
      dedicatedSupport: false
    }
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    currency: 'USD',
    billingCycle: 'monthly',
    description: 'For individual researchers and educators',
    features: [
      'Unlimited daily simulations',
      'Advanced molecular analysis',
      'Full AI What-If Chemist',
      'Real datasets (PubChem + ChEMBL)',
      'Advanced predictions',
      'Export reports (PDF/CSV)',
      'Priority email support',
      'Up to 3 team members'
    ],
    limits: {
      dailySimulations: 100,
      monthlySimulations: 1000,
      moleculesPerMonth: 500,
      advancedPredictions: true,
      realDatasets: true,
      whatIfChemist: true,
      exportReports: true,
      apiAccess: false,
      batchProcessing: false,
      dedicatedSupport: false
    }
  },
  university: {
    name: 'University',
    price: 299.99,
    currency: 'USD',
    billingCycle: 'monthly',
    description: 'For educational institutions and research groups',
    features: [
      'Unlimited simulations',
      'Full Advanced predictions',
      'Real datasets + ChEMBL bioassay data',
      'Interactive Pharmacology Lab',
      'Real-time simulation',
      'Explainable AI',
      'API access for integrations',
      'Up to 50 team members',
      'Custom training materials',
      'Email + chat support'
    ],
    limits: {
      dailySimulations: -1,
      monthlySimulations: -1,
      moleculesPerMonth: -1,
      advancedPredictions: true,
      realDatasets: true,
      whatIfChemist: true,
      exportReports: true,
      apiAccess: true,
      batchProcessing: false,
      dedicatedSupport: false
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 499.99,
    currency: 'USD',
    billingCycle: 'monthly',
    description: 'For startups and companies with advanced needs',
    features: [
      'Everything in University',
      'Unlimited team members',
      'Batch processing (100+ molecules)',
      'Custom API endpoints',
      'Dedicated account manager',
      'Priority support (24/7)',
      'SLA guarantee',
      'Custom training',
      'Advanced analytics',
      'Compliance reporting'
    ],
    limits: {
      dailySimulations: -1,
      monthlySimulations: -1,
      moleculesPerMonth: -1,
      advancedPredictions: true,
      realDatasets: true,
      whatIfChemist: true,
      exportReports: true,
      apiAccess: true,
      batchProcessing: true,
      dedicatedSupport: true
    }
  }
};

/**
 * GET /api/subscription/tiers
 * Get all subscription tiers
 */
router.get('/tiers', (req, res) => {
  res.json({
    success: true,
    data: SUBSCRIPTION_TIERS
  });
});

/**
 * GET /api/subscription/current
 * Get current user's subscription with usage metrics
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get last reset date from user model (or set today if not exists)
    const lastResetDate = user.lastDailyResetDate || new Date().toISOString().split('T')[0];
    
    // Check if we need to reset daily counter
    const today = new Date().toISOString().split('T')[0];
    if (lastResetDate !== today) {
      // Reset daily counter
      user.analysesUsedToday = 0;
      user.lastDailyResetDate = today;
      await user.save();
    }

    res.json({
      success: true,
      tier: user.subscription.tier,
      analysesUsedToday: user.analysesUsedToday || 0,
      analysesUsedThisMonth: user.analysesUsedThisMonth || 0,
      lastResetDate: user.lastDailyResetDate || today,
      isTrialActive: user.isTrialActive !== false,
      dismissedUpgradePrompt: user.dismissedUpgradePrompt || false
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade subscription tier
 */
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

    // Prevent downgrade without confirmation
    const currentTierOrder = { free: 0, pro: 1, university: 2, enterprise: 3 };
    if (currentTierOrder[newTier] < currentTierOrder[user.subscription.tier]) {
      return res.status(400).json({
        success: false,
        message: 'Please contact support to downgrade your subscription'
      });
    }

    // If upgrading to paid tier, create Stripe subscription
    if (newTier !== 'free' && !user.subscription.stripeCustomerId) {
      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'Payment method required for paid subscriptions'
        });
      }

      try {
        // Create Stripe customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user._id.toString(),
            organizationType: user.organizationType
          }
        });

        user.subscription.stripeCustomerId = customer.id;
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return res.status(400).json({
          success: false,
          message: 'Payment processing failed',
          error: stripeError.message
        });
      }
    }

    // Update subscription
    user.subscription.tier = newTier;
    user.subscription.status = 'active';
    user.subscription.startDate = new Date();
    user.subscription.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Reset usage metrics for new tier
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
        price: SUBSCRIPTION_TIERS[newTier].price,
        currency: SUBSCRIPTION_TIERS[newTier].currency
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

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cancel Stripe subscription if exists
    if (user.subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.del(user.subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
      }
    }

    // Downgrade to free tier
    user.subscription.tier = 'free';
    user.subscription.status = 'cancelled';
    user.subscription.cancelledDate = new Date();
    user.subscription.stripeSubscriptionId = null;

    await user.save();

    res.json({
      success: true,
      message: 'Subscription cancelled. Downgraded to free tier.',
      data: {
        tier: user.subscription.tier,
        status: user.subscription.status
      }
    });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/subscription/usage
 * Get current usage statistics
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const tier = user.subscription.tier;
    const usage = user.usageMetrics;
    const limits = user.limits;

    res.json({
      success: true,
      data: {
        tier,
        usage: {
          simulationsToday: {
            used: usage.simulationsUsedToday,
            limit: limits.dailySimulations === -1 ? 'unlimited' : limits.dailySimulations,
            remaining: limits.dailySimulations === -1 ? 'unlimited' : Math.max(0, limits.dailySimulations - usage.simulationsUsedToday),
            percentageUsed: limits.dailySimulations === -1 ? 0 : (usage.simulationsUsedToday / limits.dailySimulations) * 100
          },
          simulationsThisMonth: {
            used: usage.simulationsUsedThisMonth,
            limit: limits.monthlySimulations === -1 ? 'unlimited' : limits.monthlySimulations,
            remaining: limits.monthlySimulations === -1 ? 'unlimited' : Math.max(0, limits.monthlySimulations - usage.simulationsUsedThisMonth),
            percentageUsed: limits.monthlySimulations === -1 ? 0 : (usage.simulationsUsedThisMonth / limits.monthlySimulations) * 100
          },
          moleculesThisMonth: {
            used: usage.moleculesCreatedThisMonth,
            limit: limits.moleculesPerMonth === -1 ? 'unlimited' : limits.moleculesPerMonth,
            remaining: limits.moleculesPerMonth === -1 ? 'unlimited' : Math.max(0, limits.moleculesPerMonth - usage.moleculesCreatedThisMonth),
            percentageUsed: limits.moleculesPerMonth === -1 ? 0 : (usage.moleculesCreatedThisMonth / limits.moleculesPerMonth) * 100
          }
        },
        allTimeStats: {
          totalSimulations: usage.totalSimulationsAllTime,
          totalMolecules: usage.totalMoleculesCreated,
          totalPredictions: usage.totalPredictionsRun
        }
      }
    });
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/subscription/features
 * Get available features for current tier
 */
router.get('/features', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const tier = user.subscription.tier;
    const tierInfo = SUBSCRIPTION_TIERS[tier];

    res.json({
      success: true,
      data: {
        tier,
        tierName: tierInfo.name,
        features: tierInfo.features,
        canUseFeature: {
          whatIfChemist: user.canUseFeature('whatIfChemist'),
          advancedPredictions: user.canUseFeature('explainableAIPredictions'),
          realDatasets: user.canUseFeature('realTimeDataAnalysis'),
          apiAccess: user.canUseFeature('apiAccess'),
          batchProcessing: user.canUseFeature('batchProcessing'),
          dedicatedSupport: user.canUseFeature('dedicatedSupport')
        }
      }
    });
  } catch (error) {
    console.error('Features error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/subscription/team/invite
 * Invite team member
 */
router.post('/team/invite', authenticateToken, async (req, res) => {
  try {
    const { email, role = 'researcher' } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check team member limit
    const maxMembers = user.team.maxMembers;
    const currentMembers = user.team.members.length;

    if (maxMembers !== -1 && currentMembers >= maxMembers) {
      return res.status(400).json({
        success: false,
        message: `Your tier allows maximum ${maxMembers} team members`
      });
    }

    // Add invitation
    user.team.invitations.push({
      email,
      role,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending'
    });

    await user.save();

    res.json({
      success: true,
      message: `Invitation sent to ${email}`,
      data: {
        email,
        role,
        expiresAt: user.team.invitations[user.team.invitations.length - 1].expiresAt
      }
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/subscription/team
 * Get team members
 */
router.get('/team', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('team.members.userId', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        maxMembers: user.team.maxMembers,
        members: user.team.members,
        pendingInvitations: user.team.invitations
      }
    });
  } catch (error) {
    console.error('Team error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/subscription/current (Updated)
 * Get current subscription with new field names
 * Returns: { tier, analysesUsedToday, analysesUsedThisMonth, lastResetDate, dismissedUpgradePrompt }
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get last reset date from user model (or set today if not exists)
    const lastResetDate = user.lastDailyResetDate || new Date().toISOString().split('T')[0];
    
    // Check if we need to reset daily counter
    const today = new Date().toISOString().split('T')[0];
    if (lastResetDate !== today) {
      // Reset daily counter
      user.analysesUsedToday = 0;
      user.lastDailyResetDate = today;
      await user.save();
    }

    res.json({
      success: true,
      tier: user.subscription.tier,
      analysesUsedToday: user.analysesUsedToday || 0,
      analysesUsedThisMonth: user.analysesUsedThisMonth || 0,
      lastResetDate: user.lastDailyResetDate || today,
      isTrialActive: user.isTrialActive !== false,
      dismissedUpgradePrompt: user.dismissedUpgradePrompt || false
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/subscription/usage
 * Update usage metrics (called by frontend after each analysis)
 * Body: { analysesUsedToday, analysesUsedThisMonth, lastResetDate }
 */
router.post('/usage', authenticateToken, async (req, res) => {
  try {
    const { analysesUsedToday, analysesUsedThisMonth, lastResetDate } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update usage metrics
    if (typeof analysesUsedToday === 'number') {
      user.analysesUsedToday = analysesUsedToday;
    }
    if (typeof analysesUsedThisMonth === 'number') {
      user.analysesUsedThisMonth = analysesUsedThisMonth;
    }
    if (lastResetDate) {
      user.lastDailyResetDate = lastResetDate;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Usage metrics updated',
      data: {
        analysesUsedToday: user.analysesUsedToday,
        analysesUsedThisMonth: user.analysesUsedThisMonth,
        lastResetDate: user.lastDailyResetDate
      }
    });
  } catch (error) {
    console.error('Error updating usage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/subscription/reset-daily
 * Manually reset daily counter (called at midnight or on backend verification)
 */
router.post('/reset-daily', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const lastReset = user.lastDailyResetDate || '2000-01-01';

    // Only reset if date has changed
    if (lastReset !== today) {
      user.analysesUsedToday = 0;
      user.lastDailyResetDate = today;
      await user.save();

      return res.json({
        success: true,
        message: 'Daily counter reset',
        data: { analysesUsedToday: 0, lastResetDate: today }
      });
    }

    res.json({
      success: true,
      message: 'Already reset today',
      data: {
        analysesUsedToday: user.analysesUsedToday,
        lastResetDate: today
      }
    });
  } catch (error) {
    console.error('Error resetting daily counter:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/subscription/dismiss-upgrade
 * Mark upgrade prompt as dismissed
 */
router.post('/dismiss-upgrade', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.dismissedUpgradePrompt = true;
    await user.save();

    res.json({
      success: true,
      message: 'Upgrade prompt dismissed'
    });
  } catch (error) {
    console.error('Error dismissing upgrade prompt:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
module.exports.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
