const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  res.json(result);
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const result = authService.getCurrentUser(req.user);
  res.json(result);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token);
  res.json(result);
});

const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.user);
  res.json(result);
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(result);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.json(result);
});

const getGoogleUrl = asyncHandler(async (req, res) => {
  const result = authService.getGoogleAuthUrl();
  res.json(result);
});

const handleGoogleCallback = asyncHandler(async (req, res) => {
  const result = await authService.handleGoogleCallback(req.body.code);
  res.json(result);
});

const logout = asyncHandler(async (req, res) => {
  const result = authService.logout();
  res.json(result);
});

module.exports = {
  register,
  login,
  getCurrentUser,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getGoogleUrl,
  handleGoogleCallback,
  logout
};
