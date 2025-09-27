const crypto = require('crypto');
const { USER_ROLES } = require('../enums/userEnums');

const REGISTRATION_ROLE_MAP = Object.freeze({
  individual: USER_ROLES.REGULAR,
  dealer: USER_ROLES.DEALER,
  corporate: USER_ROLES.CORPORATE
});

const BUSINESS_ROLES = new Set([
  USER_ROLES.DEALER,
  USER_ROLES.CORPORATE
]);

const normalizeEmail = (email) => {
  if (typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
};

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const mapRegistrationRole = (inputRole) => {
  if (typeof inputRole !== 'string') {
    return null;
  }

  return REGISTRATION_ROLE_MAP[inputRole.trim().toLowerCase()] || null;
};

const isBusinessRole = (role) => BUSINESS_ROLES.has(role);

const isPasswordStrong = (password) => {
  if (typeof password !== 'string') {
    return false;
  }

  return password.length >= 8;
};

const createVerificationToken = () => crypto.randomBytes(32).toString('hex');

const createPasswordResetToken = () => crypto.randomBytes(32).toString('hex');

const buildBusinessProfile = (role, payload) => {
  if (!isBusinessRole(role)) {
    return undefined;
  }

  return {
    businessName: normalizeString(payload?.businessName),
    businessAddress: normalizeString(payload?.businessAddress),
    businessPhone: normalizeString(payload?.businessPhone),
    businessEmail: normalizeString(payload?.businessEmail),
    website: normalizeString(payload?.website),
    cacNumber: normalizeString(payload?.cacNumber)
  };
};

const toAuthUser = (userDoc) => {
  if (!userDoc) {
    return null;
  }

  if (typeof userDoc.toJSON === 'function') {
    const json = userDoc.toJSON({ virtuals: true });
    if (json && Object.prototype.hasOwnProperty.call(json, 'password')) {
      delete json.password;
    }
    return json;
  }

  const plain = { ...userDoc };
  delete plain.password;
  return plain;
};

module.exports = {
  normalizeEmail,
  normalizeString,
  mapRegistrationRole,
  isBusinessRole,
  isPasswordStrong,
  createVerificationToken,
  createPasswordResetToken,
  buildBusinessProfile,
  toAuthUser
};
