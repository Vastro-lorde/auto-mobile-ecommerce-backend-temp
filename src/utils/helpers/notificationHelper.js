const {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_PRIORITY_LABELS
} = require('../constants/notificationConstants');

const formatTimeAgo = (date) => {
  if (!date) return null;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatNotification = (notificationDoc) => {
  if (!notificationDoc) return null;

  const notification = notificationDoc.toObject
    ? notificationDoc.toObject({ virtuals: true })
    : notificationDoc;

  const id = notification._id?.toString?.() || notification.id;
  const notificationType = notification.notificationType;
  const priority = notification.priority;

  return {
    id,
    title: notification.title,
    message: notification.message,
    notificationType,
    typeDisplay: NOTIFICATION_TYPE_LABELS[notificationType] || notificationType,
    priority,
    priorityDisplay: NOTIFICATION_PRIORITY_LABELS[priority] || priority,
    isRead: notification.isRead,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    extraData: notification.extraData || {},
    actionUrl: notification.actionUrl || null,
    actionText: notification.actionText || null,
    timeAgo: notification.createdAt ? formatTimeAgo(notification.createdAt) : null
  };
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return undefined;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

module.exports = {
  formatNotification,
  formatTimeAgo,
  toBoolean,
  parseDate
};
