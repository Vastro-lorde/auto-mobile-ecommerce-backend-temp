const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('./emailService');
const googleAuthService = require('./googleAuthService');
const { AppError } = require('../middleware/errorHandler');
const { generateToken } = require('../middleware/auth');
const {
  normalizeEmail,
  normalizeString,
  mapRegistrationRole,
  isBusinessRole,
  isPasswordStrong,
  createVerificationToken,
  createPasswordResetToken,
  buildBusinessProfile,
  toAuthUser
} = require('../utils/helpers/authHelper');
const { USER_ROLES } = require('../utils/enums/userEnums');

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const ensureCredentials = ({ email, password, role }) => {
  if (!email || !password || !role) {
    throw new AppError('Email, password, and role are required', 400);
  }
};

const ensureValidRole = (role) => {
  if (!role) {
    throw new AppError('Invalid role. Must be individual, dealer, or corporate', 400);
  }
};

const ensureBusinessRequirements = (role, payload) => {
  if (!isBusinessRole(role)) {
    return;
  }

  if (!payload?.businessName) {
    throw new AppError('Business name is required for dealer and corporate accounts', 400);
  }

  if (role === USER_ROLES.CORPORATE && !payload?.cacNumber) {
    throw new AppError('CAC number is required for corporate accounts', 400);
  }
};

const ensurePasswordStrength = (password) => {
  if (!isPasswordStrong(password)) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }
};

const registerUser = async (payload) => {
  ensureCredentials(payload);

  const normalizedEmail = normalizeEmail(payload.email);
  if (!normalizedEmail) {
    throw new AppError('Please provide a valid email address', 400);
  }

  const mappedRole = mapRegistrationRole(payload.role);
  ensureValidRole(mappedRole);
  ensureBusinessRequirements(mappedRole, payload);
  ensurePasswordStrength(payload.password);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const verificationToken = createVerificationToken();
  const businessProfile = buildBusinessProfile(mappedRole, payload);

  const user = new User({
    email: normalizedEmail,
    password: payload.password,
    firstName: normalizeString(payload.firstName),
    lastName: normalizeString(payload.lastName),
    phone: normalizeString(payload.phone),
    role: mappedRole,
    businessProfile,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: new Date(Date.now() + VERIFICATION_EXPIRY_MS)
  });

  await user.save();

  const token = generateToken(user._id);

  // Fire and forget for welcome email
  emailService.sendWelcomeEmail(user).catch((error) => {
    console.error('Failed to send welcome email:', error.message);
  });

  // Fire and forget for verification email
  emailService.sendEmailVerification(user, verificationToken).catch((error) => {
    console.error('Failed to send verification email:', error.message);
  });

  return {
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    token,
    user: toAuthUser(user)
  };
};

const loginUser = async (payload) => {
  const { email, password } = payload || {};

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new AppError('Please provide a valid email address', 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 400);
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new AppError('Invalid email or password', 400);
  }

  if (user.status === 'suspended') {
    throw new AppError('Your account has been suspended. Please contact support.', 423);
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);

  return {
    success: true,
    message: 'Login successful',
    token,
    user: toAuthUser(user)
  };
};

const getCurrentUser = (user) => ({
  success: true,
  user: toAuthUser(user)
});

const verifyEmail = async (token) => {
  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return {
    success: true,
    message: 'Email verified successfully'
  };
};

const resendVerificationEmail = async (user) => {
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  user.emailVerificationToken = createVerificationToken();
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
  await user.save();

  try {
    await emailService.sendEmailVerification(user, user.emailVerificationToken);
  } catch (error) {
    console.error('Failed to send verification email:', error.message);
    throw new AppError('Failed to send verification email', 500);
  }

  return {
    success: true,
    message: 'Verification email sent successfully'
  };
};

const requestPasswordReset = async (email) => {
  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new AppError('Please provide a valid email address', 400);
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // Do not reveal user existence
    return {
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    };
  }

  const resetToken = createPasswordResetToken();
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
  await user.save();

  try {
    await emailService.sendPasswordReset(user, resetToken);
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    throw new AppError('Failed to send password reset email', 500);
  }

  return {
    success: true,
    message: 'Password reset email sent successfully'
  };
};

const resetPassword = async ({ token, password }) => {
  if (!token || !password) {
    throw new AppError('Token and password are required', 400);
  }

  ensurePasswordStrength(password);

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired password reset token', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return {
    success: true,
    message: 'Password reset successful'
  };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  ensurePasswordStrength(newPassword);

  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isCurrentValid = await user.comparePassword(currentPassword);
  if (!isCurrentValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  return {
    success: true,
    message: 'Password changed successfully'
  };
};

const getGoogleAuthUrl = () => ({
  success: true,
  authUrl: googleAuthService.getAuthUrl()
});

const handleGoogleCallback = async (code) => {
  if (!code) {
    throw new AppError('OAuth code is required', 400);
  }

  const googleUser = await googleAuthService.handleCallback(code);

  const normalizedEmail = normalizeEmail(googleUser.email);
  const tokens = googleUser.tokens || {};

  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    user.googleId = googleUser.googleId;
    user.googleEmail = googleUser.email;
    user.googleName = googleUser.displayName;
    user.googlePicture = googleUser.avatar;
    user.googleAccessToken = tokens.accessToken;
    user.googleRefreshToken = tokens.refreshToken;
    user.googleIdToken = tokens.idToken;
    user.isGoogleUser = true;
    user.isEmailVerified = user.isEmailVerified || Boolean(googleUser.emailVerified);

    user.firstName = user.firstName || normalizeString(googleUser.firstName);
    user.lastName = user.lastName || normalizeString(googleUser.lastName);
    user.avatar = user.avatar || googleUser.avatar;
    user.lastLogin = new Date();

    await user.save();
  } else {
    user = new User({
      email: normalizedEmail,
      firstName: normalizeString(googleUser.firstName),
      lastName: normalizeString(googleUser.lastName),
      avatar: googleUser.avatar,
      isEmailVerified: Boolean(googleUser.emailVerified),
      role: USER_ROLES.REGULAR,
      googleId: googleUser.googleId,
      googleEmail: googleUser.email,
      googleName: googleUser.displayName,
      googlePicture: googleUser.avatar,
      googleAccessToken: tokens.accessToken,
      googleRefreshToken: tokens.refreshToken,
      googleIdToken: tokens.idToken,
      isGoogleUser: true,
      lastLogin: new Date()
    });

    await user.save();

    emailService.sendWelcomeEmail(user).catch((error) => {
      console.error('Failed to send welcome email:', error.message);
    });
  }

  const token = generateToken(user._id);

  return {
    success: true,
    message: 'Google authentication successful',
    token,
    user: toAuthUser(user)
  };
};

const logout = () => ({
  success: true,
  message: 'Logout successful'
});

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getGoogleAuthUrl,
  handleGoogleCallback,
  logout
};
