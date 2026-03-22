/**
 * Authentication and Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to check if user has exceeded usage limits
 */
const checkUsageQuota = async (req, res, next) => {
  try {
    // Get auth token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // Allow unauthenticated users to continue (they'll be rate-limited globally)
      return next();
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if subscription is active
    if (user.subscription.status === 'suspended' || user.subscription.status === 'cancelled') {
      return res.status(403).json({
        success: false,
        message: `Your subscription is ${user.subscription.status}`,
        action: 'Please renew your subscription to continue'
      });
    }

    // Store user in request for next middleware
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error('Usage quota check error:', error);
    // If token is invalid, continue (will be handled elsewhere)
    next();
  }
};

/**
 * Middleware to enforce action limits
 */
const enforceActionLimit = (actionType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        // Unauthenticated user - apply global limits
        return next();
      }

      const user = req.user;

      // Check if user can perform action
      if (typeof user.canPerformAction === 'function' && !user.canPerformAction(actionType)) {
        const remaining = typeof user.getRemainingQuota === 'function' 
          ? user.getRemainingQuota(actionType) 
          : 0;

        return res.status(429).json({
          success: false,
          message: `You have exceeded your ${actionType} quota for this period`,
          remaining,
          tier: user.subscription?.tier || 'free',
          action: `Upgrade to ${user.subscription?.tier === 'free' ? 'Pro' : 'Enterprise'} for more ${actionType}s`,
          upgradeUrl: '/api/subscription/upgrade'
        });
      }

      next();
    } catch (error) {
      console.error('Action limit error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking usage limits'
      });
    }
  };
};

/**
 * Middleware to check if user has access to a feature
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          requiredFeature: featureName
        });
      }

      if (!req.user.canUseFeature(featureName)) {
        return res.status(403).json({
          success: false,
          message: `${featureName} is not available on your tier`,
          currentTier: req.user.subscription.tier,
          requiredTier: 'Pro or higher',
          upgradeUrl: '/api/subscription/upgrade'
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature access'
      });
    }
  };
};

/**
 * Middleware to authenticate token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Middleware to track API usage
 */
const trackUsage = (actionType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to track usage after successful response
    res.send = function(data) {
      // Only track successful requests
      if (res.statusCode < 400 && req.user) {
        updateUserUsage(req.user._id, actionType);
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Helper function to update user usage
 */
async function updateUserUsage(userId, actionType) {
  try {
    const user = await User.findById(userId);

    if (!user) return;

    const today = new Date();
    const lastReset = new Date(user.usageMetrics.lastResetDate);

    // Reset if day has changed
    if (today.getDate() !== lastReset.getDate()) {
      user.usageMetrics.simulationsUsedToday = 0;
      user.usageMetrics.lastResetDate = today;
    }

    // Reset if month has changed
    if (today.getMonth() !== lastReset.getMonth()) {
      user.usageMetrics.simulationsUsedThisMonth = 0;
      user.usageMetrics.moleculesCreatedThisMonth = 0;
    }

    // Increment counters
    switch (actionType) {
      case 'simulation':
        user.usageMetrics.simulationsUsedToday += 1;
        user.usageMetrics.simulationsUsedThisMonth += 1;
        user.usageMetrics.totalSimulationsAllTime += 1;
        break;

      case 'create_molecule':
        user.usageMetrics.moleculesCreatedThisMonth += 1;
        user.usageMetrics.totalMoleculesCreated += 1;
        break;

      case 'prediction':
        user.usageMetrics.totalPredictionsRun += 1;
        break;

      default:
        break;
    }

    await user.save();
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

/**
 * Middleware to validate subscription tier for operations
 */
const requireTier = (requiredTiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!requiredTiers.includes(req.user.subscription.tier)) {
      return res.status(403).json({
        success: false,
        message: `This operation requires ${requiredTiers.join(' or ')} tier`,
        currentTier: req.user.subscription.tier,
        upgradeUrl: '/api/subscription/upgrade'
      });
    }

    next();
  };
};

/**
 * Middleware for role-based access control
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user's role in organization
    // This would be extended for team-based roles
    const userRole = 'admin'; // Placeholder

    if (!requiredRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${requiredRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check monthly usage reset
 */
const resetMonthlyMetrics = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const user = req.user;
    const lastReset = new Date(user.usageMetrics.lastResetDate);
    const today = new Date();

    // Check if month has changed
    if (today.getMonth() !== lastReset.getMonth() || today.getFullYear() !== lastReset.getFullYear()) {
      user.usageMetrics.simulationsUsedThisMonth = 0;
      user.usageMetrics.moleculesCreatedThisMonth = 0;
      user.usageMetrics.lastResetDate = today;
      await user.save();
      req.user = user; // Update request object
    }

    next();
  } catch (error) {
    console.error('Error resetting metrics:', error);
    next();
  }
};

module.exports = {
  checkUsageQuota,
  enforceActionLimit,
  requireFeature,
  authenticateToken,
  trackUsage,
  requireTier,
  requireRole,
  resetMonthlyMetrics,
  updateUserUsage
};
