const env = require('../../config/env');

const withLayout = (title, content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">${title}</h1>
    </div>
    <div style="padding: 20px;">
      ${content}
    </div>
    <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #666;">
      <p>${env.productName} - Your Trusted Car Marketplace</p>
      <p>This email was sent by ${env.productName}</p>
    </div>
  </div>
`;

const renderWelcomeEmail = (user) => {
  const displayName = user.displayName || user.email;
  const emailVerifiedNotice = !user.isEmailVerified
    ? `
      <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Important:</strong> Please verify your email address to access all features.</p>
      </div>
    `
    : '';

  const content = `
    <h2>Hello ${displayName}!</h2>
  <p>Welcome to ${env.productName}, Nigeria's premier car marketplace. We're excited to have you join our community!</p>
    <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
  <h3 style="color: #1a365d; margin-top: 0;">What you can do with ${env.productName}:</h3>
      <ul style="margin: 0;">
        <li>Buy and sell cars with confidence</li>
        <li>Connect with verified dealers and individuals</li>
        <li>Access financing options</li>
        <li>Get professional car inspections</li>
        <li>Chat securely with potential buyers/sellers</li>
      </ul>
    </div>
    ${emailVerifiedNotice}
    <p>If you have any questions or need assistance, feel free to contact our support team.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${env.app.frontendUrl}" style="background-color: #1a365d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
  Start Exploring ${env.productName}
      </a>
    </div>
    <p>This email was sent to ${user.email}</p>
  `;

  return withLayout(`Welcome to ${env.productName}!`, content);
};

const renderEmailVerificationEmail = (user, token) => {
  const displayName = user.displayName || user.email;
  const verificationUrl = `${env.app.frontendUrl}/verify-email?token=${token}`;

  const content = `
    <h2>Hello ${displayName}!</h2>
  <p>Thank you for signing up with ${env.productName}. To complete your registration and access all features, please verify your email address.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background-color: #38a169; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Verify Email Address
      </a>
    </div>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #1a365d;">${verificationUrl}</p>
    <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Note:</strong> This verification link will expire in 24 hours for security reasons.</p>
    </div>
    <p>This email was sent to ${user.email}</p>
  `;

  return withLayout('Verify Your Email', content);
};

const renderPasswordResetEmail = (user, token) => {
  const displayName = user.displayName || user.email;
  const resetUrl = `${env.app.frontendUrl}/reset-password?token=${token}`;

  const content = `
    <h2>Hello ${displayName}!</h2>
  <p>We received a request to reset your ${env.productName} account password.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background-color: #e53e3e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #1a365d;">${resetUrl}</p>
    <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Important:</strong></p>
      <ul style="margin: 10px 0 0 20px;">
        <li>This reset link will expire in 1 hour</li>
        <li>If you didn't request this reset, please ignore this email</li>
        <li>Your password won't change until you create a new one</li>
      </ul>
    </div>
    <p>This email was sent to ${user.email}</p>
  `;

  return withLayout('Reset Your Password', content);
};

module.exports = {
  renderWelcomeEmail,
  renderEmailVerificationEmail,
  renderPasswordResetEmail
};
