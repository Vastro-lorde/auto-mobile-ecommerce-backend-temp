const USER_ROLES = Object.freeze({
  REGULAR: 'regular',
  DEALER: 'dealer',
  CORPORATE: 'corporate',
  AGENT: 'agent',
  SUPERVISOR: 'supervisor'
});

const AGENT_DEPARTMENTS = Object.freeze({
  MODERATION: 'moderation',
  VERIFICATION: 'verification',
  CUSTOMER_SUPPORT: 'customer_support',
  TECHNICAL_SUPPORT: 'technical_support',
  ADMIN: 'admin',
  FINANCE: 'finance',
  MARKETING: 'marketing'
});

const AGENT_PERMISSION_LEVELS = Object.freeze({
  BASIC: 'basic',
  SENIOR: 'senior',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin'
});

module.exports = {
  USER_ROLES,
  AGENT_DEPARTMENTS,
  AGENT_PERMISSION_LEVELS
};
