/**
 * Email Notification Service
 * Handles sending verification, password reset, and subscription emails
 */

const nodemailer = require('nodemailer');

// Configure your email service (using environment variables)
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || ''
  },
  from: process.env.EMAIL_FROM || 'noreply@vitalis-ai.com'
};

const transporter = nodemailer.createTransport(emailConfig);

/**
 * Verify transporter connection (call on startup)
 */
async function verifyEmailService() {
  try {
    await transporter.verify();
    console.log('✓ Email service verified');
    return true;
  } catch (error) {
    console.warn('⚠️  Email service not configured:', error.message);
    console.warn('   Emails will be logged to console instead');
    return false;
  }
}

/**
 * Send email verification email
 */
async function sendVerificationEmail(user, verificationToken) {
  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: emailConfig.from,
    to: user.email,
    subject: 'Verify your Vitalis AI account',
    html: `
      <h2>Welcome to Vitalis AI! 🚀</h2>
      <p>Hi ${user.firstName || 'User'},</p>
      <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
      <a href="${verificationLink}" style="
        display: inline-block;
        padding: 12px 30px;
        background-color: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin: 20px 0;
      ">Verify Email</a>
      <p>Or paste this link in your browser:</p>
      <p><code>${verificationLink}</code></p>
      <p>This link expires in 24 hours.</p>
      <p>Best regards,<br>Vitalis AI Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Verification email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV EMAIL] Verification link: ${verificationLink}`);
    }
    return false;
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, resetToken) {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: emailConfig.from,
    to: user.email,
    subject: 'Reset your Vitalis AI password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${user.firstName || 'User'},</p>
      <p>We received a request to reset your password. Click the button below to proceed:</p>
      <a href="${resetLink}" style="
        display: inline-block;
        padding: 12px 30px;
        background-color: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin: 20px 0;
      ">Reset Password</a>
      <p>Or paste this link in your browser:</p>
      <p><code>${resetLink}</code></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>Vitalis AI Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Password reset email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV EMAIL] Reset link: ${resetLink}`);
    }
    return false;
  }
}

/**
 * Send subscription upgrade confirmation
 */
async function sendSubscriptionUpgradeEmail(user, newTier, price) {
  const mailOptions = {
    from: emailConfig.from,
    to: user.email,
    subject: `Welcome to Vitalis AI ${newTier} tier!`,
    html: `
      <h2>Subscription Upgraded! 🎉</h2>
      <p>Hi ${user.firstName || 'User'},</p>
      <p>Your subscription has been successfully upgraded to the <strong>${newTier.toUpperCase()}</strong> tier!</p>
      <h3>What's included:</h3>
      <ul>
        <li>Advanced AI predictions</li>
        <li>Unlimited simulations</li>
        <li>Premium data access</li>
        <li>Priority support</li>
      </ul>
      <h3>Billing Info:</h3>
      <p><strong>Tier:</strong> ${newTier}</p>
      <p><strong>Price:</strong> $${price}/month</p>
      <p><strong>Renewal Date:</strong> ${new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</p>
      <p>You can manage your subscription at any time in your account settings.</p>
      <p>Best regards,<br>Vitalis AI Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Upgrade confirmation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending upgrade email:', error);
    return false;
  }
}

/**
 * Send subscription cancellation confirmation
 */
async function sendSubscriptionCancellationEmail(user) {
  const mailOptions = {
    from: emailConfig.from,
    to: user.email,
    subject: 'Your Vitalis AI subscription has been cancelled',
    html: `
      <h2>Subscription Cancelled</h2>
      <p>Hi ${user.firstName || 'User'},</p>
      <p>Your subscription has been cancelled. Your account has been downgraded to the <strong>FREE</strong> tier.</p>
      <h3>What happens next:</h3>
      <ul>
        <li>You'll lose access to premium features</li>
        <li>Your usage will be limited to free tier quotas</li>
        <li>You can re-upgrade anytime</li>
      </ul>
      <p>We'd love to hear why you cancelled. Your feedback helps us improve.</p>
      <p>If you'd like to reactivate your subscription, visit your account settings.</p>
      <p>Best regards,<br>Vitalis AI Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Cancellation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return false;
  }
}

/**
 * Send team member invitation
 */
async function sendTeamInvitationEmail(inviteEmail, invitedBy, teamName, invitationLink) {
  const mailOptions = {
    from: emailConfig.from,
    to: inviteEmail,
    subject: `You're invited to join ${teamName} on Vitalis AI`,
    html: `
      <h2>Team Invitation 👥</h2>
      <p>Hi,</p>
      <p><strong>${invitedBy.firstName}</strong> from <strong>${teamName}</strong> has invited you to join their team on Vitalis AI!</p>
      <p>Click the button below to accept the invitation:</p>
      <a href="${invitationLink}" style="
        display: inline-block;
        padding: 12px 30px;
        background-color: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin: 20px 0;
      ">Accept Invitation</a>
      <p>Or paste this link in your browser:</p>
      <p><code>${invitationLink}</code></p>
      <p>This invitation expires in 7 days.</p>
      <p>Best regards,<br>Vitalis AI Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Team invitation email sent to ${inviteEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending team invitation email:', error);
    return false;
  }
}

/**
 * Send payment failure notification
 */
async function sendPaymentFailureEmail(user, reason) {
  const mailOptions = {
    from: emailConfig.from,
    to: user.email,
    subject: '⚠️ Payment failed for your Vitalis AI subscription',
    html: `
      <h2>Payment Failed</h2>
      <p>Hi ${user.firstName || 'User'},</p>
      <p>We attempted to charge your payment method for your subscription renewal, but it failed.</p>
      <h3>Reason:</h3>
      <p>${reason}</p>
      <h3>What to do:</h3>
      <p>Please update your payment method in your account settings within 7 days to avoid losing access.</p>
      <p>If you need help, please contact our support team.</p>
      <p>Best regards,<br>Vitalis AI Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Payment failure email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending payment failure email:', error);
    return false;
  }
}

/**
 * Send usage limit warning
 */
async function sendUsageLimitWarningEmail(user, usageType, percentageUsed) {
  const mailOptions = {
    from: emailConfig.from,
    to: user.email,
    subject: `⚠️ You're approaching your ${usageType} limit on Vitalis AI`,
    html: `
      <h2>Usage Limit Warning</h2>
      <p>Hi ${user.firstName || 'User'},</p>
      <p>You've used <strong>${percentageUsed}%</strong> of your monthly <strong>${usageType}</strong> quota.</p>
      <p>Your current tier: <strong>${user.subscription.tier.toUpperCase()}</strong></p>
      <h3>Options:</h3>
      <ul>
        <li>Upgrade to a higher tier for more quota</li>
        <li>Wait until next month for your quota to reset</li>
      </ul>
      <p>Upgrade now to continue uninterrupted access.</p>
      <p>Best regards,<br>Vitalis AI Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Usage warning email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending usage warning email:', error);
    return false;
  }
}

module.exports = {
  verifyEmailService,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionUpgradeEmail,
  sendSubscriptionCancellationEmail,
  sendTeamInvitationEmail,
  sendPaymentFailureEmail,
  sendUsageLimitWarningEmail
};
