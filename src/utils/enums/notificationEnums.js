const NOTIFICATION_TYPES = Object.freeze({
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  EMAIL_VERIFIED: 'email_verified',
  PHONE_VERIFICATION: 'phone_verification',
  PHONE_VERIFIED: 'phone_verified',
  FACIAL_VERIFICATION: 'facial_verification',
  FACIAL_VERIFIED: 'facial_verified',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  PROFILE_UPDATED: 'profile_updated',
  LISTING_CREATED: 'listing_created',
  LISTING_APPROVED: 'listing_approved',
  LISTING_REJECTED: 'listing_rejected',
  MESSAGE_RECEIVED: 'message_received',
  ACCOUNT_SUSPENDED: 'account_suspended',
  ACCOUNT_REACTIVATED: 'account_reactivated',
  SECURITY_ALERT: 'security_alert',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  PROMOTION: 'promotion',
  AUCTION_ACCESS: 'auction_access',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  BOOST_EXPIRY_WARNING_5D: 'boost_expiry_warning_5d',
  BOOST_EXPIRY_WARNING_3D: 'boost_expiry_warning_3d',
  BOOST_EXPIRY_WARNING_24H: 'boost_expiry_warning_24h',
  BOOST_EXPIRY_WARNING_6H: 'boost_expiry_warning_6h',
  BOOST_EXPIRED: 'boost_expired',
  SUBSCRIPTION: 'subscription'
});

const NOTIFICATION_PRIORITIES = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
});

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
};
