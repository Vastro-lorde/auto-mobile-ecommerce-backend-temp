const mongoose = require('mongoose');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
} = require('../utils/enums/notificationEnums');
const {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_PRIORITY_LABELS
} = require('../utils/constants/notificationConstants');

const notificationSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  notificationType: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    default: NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(NOTIFICATION_PRIORITIES),
    default: NOTIFICATION_PRIORITIES.NORMAL
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  extraData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  actionUrl: {
    type: String,
    trim: true
  },
  actionText: {
    type: String,
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

notificationSchema.methods.markAsRead = function markAsRead() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this;
};

notificationSchema.methods.toJSON = function() {
  const notification = this.toObject({ virtuals: true });
  notification.id = notification._id;
  delete notification._id;
  delete notification.__v;
  return notification;
};

const preferenceSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true,
    unique: true
  },
  email_welcome: { type: Boolean, default: true },
  email_verification: { type: Boolean, default: true },
  email_security: { type: Boolean, default: true },
  email_account_updates: { type: Boolean, default: true },
  email_listing_updates: { type: Boolean, default: true },
  email_messages: { type: Boolean, default: true },
  email_promotions: { type: Boolean, default: false },
  app_security: { type: Boolean, default: true },
  app_account_updates: { type: Boolean, default: true },
  app_listing_updates: { type: Boolean, default: true },
  app_messages: { type: Boolean, default: true },
  app_promotions: { type: Boolean, default: true }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

preferenceSchema.methods.toJSON = function() {
  const preference = this.toObject({ virtuals: true });
  preference.id = preference._id;
  delete preference._id;
  delete preference.__v;
  return preference;
};

const Notification = mongoose.model('Notification', notificationSchema);
const NotificationPreference = mongoose.model('NotificationPreference', preferenceSchema);

module.exports = {
  Notification,
  NotificationPreference,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_LABELS
};
