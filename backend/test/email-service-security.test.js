'use strict';

const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: mockSendMail, verify: jest.fn() }),
}));

const EmailService = require('../src/services/EmailService');

describe('EmailService sensitive logging', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    mockSendMail.mockReset().mockResolvedValue({});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('does not log recipient addresses on successful notifications', async () => {
    const email = 'private.person@example.test';
    const user = { email, firstName: 'Private', subscription: { tier: 'free', currentPeriodEnd: Date.now() } };

    await EmailService.sendVerificationEmail(user, 'verify-secret');
    await EmailService.sendPasswordResetEmail(user, 'reset-secret');
    await EmailService.sendSubscriptionUpgradeEmail(user, 'pro', 20);
    await EmailService.sendSubscriptionCancellationEmail(user);
    await EmailService.sendTeamInvitationEmail(email, { firstName: 'Admin' }, 'Team', 'invite-secret');
    await EmailService.sendPaymentFailureEmail(user, 'declined');
    await EmailService.sendUsageLimitWarningEmail(user, 'analysis', 90);

    const logs = logSpy.mock.calls.flat().join(' ');
    expect(logs).not.toContain(email);
  });

  test('does not log reset links when delivery fails in development', async () => {
    const previousMode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    mockSendMail.mockRejectedValueOnce(new Error('delivery failed'));

    try {
      await EmailService.sendPasswordResetEmail({ email: 'private.person@example.test' }, 'reset-secret');
      const logs = logSpy.mock.calls.flat().join(' ');
      expect(logs).not.toContain('reset-secret');
      expect(logs).not.toContain('token=');
    } finally {
      if (previousMode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousMode;
    }
  });
});