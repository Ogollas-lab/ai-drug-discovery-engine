/**
 * Stripe Webhook Handler
 * Processes webhook events from Stripe for subscription management
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Webhook endpoint to handle Stripe events
 * This should be called via POST from Stripe with raw body
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error(`❌ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`\n📨 Stripe Webhook Event: ${event.type}`);

  try {
    switch (event.type) {
      // Customer subscription created
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      // Customer subscription updated
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      // Customer subscription deleted
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      // Payment succeeded
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      // Payment failed
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      // Charge dispute opened
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription) {
  try {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });

    if (!user) {
      console.log(`⚠️  No user found for Stripe customer: ${subscription.customer}`);
      return;
    }

    user.subscription.stripeSubscriptionId = subscription.id;
    user.subscription.status = subscription.status === 'active' ? 'active' : 'pending';
    user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    user.subscription.autoRenew = !subscription.cancel_at_period_end;

    await user.save();
    console.log(`✓ Subscription created for user: ${user._id}`);
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });

    if (!user) {
      console.log(`⚠️  No user found for subscription: ${subscription.id}`);
      return;
    }

    // Update subscription status
    user.subscription.status = subscription.status === 'active' ? 'active' : 'suspended';
    user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    user.subscription.autoRenew = !subscription.cancel_at_period_end;

    // Check if subscription is being cancelled
    if (subscription.cancel_at_period_end) {
      console.log(`⚠️  Subscription scheduled for cancellation for user: ${user._id}`);
      // Optionally notify user
    }

    await user.save();
    console.log(`✓ Subscription updated for user: ${user._id}`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });

    if (!user) {
      console.log(`⚠️  No user found for subscription: ${subscription.id}`);
      return;
    }

    // Downgrade to free tier
    user.subscription.tier = 'free';
    user.subscription.status = 'cancelled';
    user.subscription.stripeSubscriptionId = null;
    user.subscription.autoRenew = false;

    await user.save();
    console.log(`✓ Subscription deleted for user: ${user._id} - Downgraded to free tier`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

/**
 * Handle payment succeeded event
 */
async function handlePaymentSucceeded(invoice) {
  try {
    // Find user by Stripe customer ID
    const user = await User.findOne({ stripeCustomerId: invoice.customer });

    if (!user) {
      console.log(`⚠️  No user found for Stripe customer: ${invoice.customer}`);
      return;
    }

    // Update subscription status
    user.subscription.status = 'active';
    user.subscription.lastPaymentDate = new Date();
    user.subscription.lastPaymentAmount = (invoice.total / 100).toFixed(2); // Convert cents to dollars

    await user.save();
    console.log(`✓ Payment succeeded for user: ${user._id} - Amount: $${user.subscription.lastPaymentAmount}`);

    // Optionally send confirmation email
    // await sendPaymentConfirmationEmail(user);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(invoice) {
  try {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });

    if (!user) {
      console.log(`⚠️  No user found for Stripe customer: ${invoice.customer}`);
      return;
    }

    user.subscription.status = 'payment_failed';
    user.subscription.failedPaymentReason = invoice.last_finalization_error?.message || 'Payment failed';

    await user.save();
    console.log(`✗ Payment failed for user: ${user._id}`);

    // Optionally send retry notification email
    // await sendPaymentFailureEmail(user);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle charge dispute event
 */
async function handleChargeDispute(charge) {
  try {
    const user = await User.findOne({ stripeCustomerId: charge.customer });

    if (!user) {
      console.log(`⚠️  No user found for Stripe customer: ${charge.customer}`);
      return;
    }

    user.subscription.status = 'disputed';
    
    await user.save();
    console.log(`⚠️  Charge dispute opened for user: ${user._id}`);

    // Optionally send dispute notification to admin
    // await notifyAdminOfDispute(user, charge);
  } catch (error) {
    console.error('Error handling charge dispute:', error);
  }
}

/**
 * Utility: Retrieve customer subscription from Stripe
 */
async function getStripeSubscription(customerId) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1
    });

    return subscriptions.data[0] || null;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

/**
 * Utility: Cancel subscription in Stripe
 */
async function cancelStripeSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return null;
  }
}

module.exports = router;
