const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('./auth');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/stats
 * Get overall platform telemetry
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const paidUsers = await User.countDocuments({ 'subscription.tier': { $in: ['pro', 'university', 'enterprise'] } });
    
    const users = await User.find({});
    const totalSimulations = users.reduce((acc, curr) => acc + (curr.usageMetrics?.totalSimulationsAllTime || 0), 0);
    const mrr = users.reduce((acc, curr) => {
      if (curr.subscription.tier === 'pro') return acc + 9.99;
      if (curr.subscription.tier === 'university') return acc + 299.99;
      if (curr.subscription.tier === 'enterprise') return acc + 499.99;
      return acc;
    }, 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        paidUsers,
        totalSimulations,
        mrr: mrr.toFixed(2),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const users = await User.find({})
      .select('firstName lastName email subscription.tier subscription.status role createdAt usageMetrics.totalSimulationsAllTime')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/users/:id/tier
 * Manually update a user's subscription tier
 */
router.put('/users/:id/tier', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { tier } = req.body;
    const validTiers = ['free', 'pro', 'university', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ success: false, message: 'Invalid tier' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    targetUser.subscription.tier = tier;
    targetUser.subscription.status = 'active';
    await targetUser.save();

    res.json({ success: true, message: `Updated user to ${tier} tier`, user: targetUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
