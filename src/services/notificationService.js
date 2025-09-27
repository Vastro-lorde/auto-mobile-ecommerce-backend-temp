const mongoose = require('mongoose');
const { Notification, NotificationPreference } = require('../models/Notification');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
} = require('../utils/enums/notificationEnums');
const Listing = require('../models/Listing');
const {
  formatNotification,
  toBoolean,
  parseDate
} = require('../utils/helpers/notificationHelper');
const { AppError } = require('../middleware/errorHandler');
const {
  emitNotificationCreated,
  emitNotificationUpdated,
  emitNotificationDeleted,
  emitNotificationsRefresh,
  emitUnreadCount
} = require('../utils/socketHandler');

const notificationTypeValues = new Set(Object.values(NOTIFICATION_TYPES));
const notificationPriorityValues = new Set(Object.values(NOTIFICATION_PRIORITIES));

const toUserIdString = (userId) => {
  if (!userId) {
    return null;
  }

  return typeof userId === 'string' ? userId : userId.toString();
};

const emitSafe = (emitter, userId, payload) => {
  if (typeof emitter !== 'function') {
    return false;
  }

  const id = toUserIdString(userId);
  if (!id) {
    return false;
  }

  try {
    return emitter(id, payload);
  } catch (error) {
    console.warn(`Notification socket emit failed for user ${id}:`, error.message);
    return false;
  }
};

const broadcastUnreadCount = async (userId) => {
  const id = toUserIdString(userId);
  if (!id) {
    return null;
  }

  try {
    const count = await Notification.countDocuments({ user: userId, isRead: false });
    emitSafe(emitUnreadCount, userId, count);
    return count;
  } catch (error) {
    console.warn(`Failed to broadcast unread count for user ${id}:`, error.message);
    return null;
  }
};

const buildFilters = (userId, query = {}) => {
  const filters = { user: userId };

  if (query.is_read !== undefined) {
    const parsed = toBoolean(query.is_read);
    if (parsed !== undefined) {
      filters.isRead = parsed;
    }
  }

  if (query.notification_type) {
    filters.notificationType = query.notification_type;
  }

  if (query.priority) {
    filters.priority = query.priority;
  }

  const dateFrom = parseDate(query.date_from);
  const dateTo = parseDate(query.date_to);

  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.$gte = dateFrom;
    if (dateTo) filters.createdAt.$lte = dateTo;
  }

  return filters;
};

const createNotification = async ({
  userId,
  title,
  message,
  notificationType = NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
  priority = NOTIFICATION_PRIORITIES.NORMAL,
  extraData = {},
  actionUrl = null,
  actionText = null
}) => {
  try {
    if (!userId) {
      throw new AppError('userId is required to create a notification', 400);
    }

    if (!title || !message) {
      throw new AppError('Notification title and message are required', 400);
    }

    if (!notificationTypeValues.has(notificationType)) {
      throw new AppError('Invalid notification type', 400);
    }

    if (!notificationPriorityValues.has(priority)) {
      throw new AppError('Invalid notification priority', 400);
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      notificationType,
      priority,
      extraData,
      actionUrl,
      actionText
    });

    const formattedNotification = formatNotification(notification);

    emitSafe(emitNotificationCreated, userId, formattedNotification);
    await broadcastUnreadCount(userId);

    return formattedNotification;
  } catch (error) {
    throw error;
  }
};

const listNotifications = async (user, query, pagination = {}) => {
  try {
    const page = Number(pagination.page) > 0 ? Number(pagination.page) : 1;
    const limit = Number(pagination.limit) > 0 ? Math.min(Number(pagination.limit), 100) : 20;
    const skip = (page - 1) * limit;

    const filters = buildFilters(user._id, query);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filters),
      Notification.countDocuments({ user: user._id, isRead: false })
    ]);

    return {
      success: true,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
        unread: unreadCount
      },
      notifications: notifications.map(formatNotification)
    };
  } catch (error) {
    throw error;
  }
};

const getNotification = async (user, notificationId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError('Invalid notification ID', 400);
    }

    const notification = await Notification.findOne({ _id: notificationId, user: user._id });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    return {
      success: true,
      notification: formatNotification(notification)
    };
  } catch (error) {
    throw error;
  }
};

const createNotificationForUser = async (user, payload) => {
  try {
    const notification = await createNotification({
      userId: user._id,
      ...payload
    });

    return {
      success: true,
      notification
    };
  } catch (error) {
    throw error;
  }
};

const updateNotification = async (user, notificationId, data) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError('Invalid notification ID', 400);
    }

    const notification = await Notification.findOne({ _id: notificationId, user: user._id });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    const fieldMap = {
      title: ['title'],
      message: ['message'],
      notificationType: ['notificationType', 'notification_type'],
      priority: ['priority'],
      extraData: ['extraData', 'extra_data'],
      actionUrl: ['actionUrl', 'action_url'],
      actionText: ['actionText', 'action_text'],
      isRead: ['isRead', 'is_read']
    };

    Object.entries(fieldMap).forEach(([field, aliases]) => {
      const value = aliases.map((alias) => data[alias]).find((val) => val !== undefined);
      if (value !== undefined) {
        notification[field] = value;
      }
    });

    if (notification.notificationType && !notificationTypeValues.has(notification.notificationType)) {
      throw new AppError('Invalid notification type', 400);
    }

    if (notification.priority && !notificationPriorityValues.has(notification.priority)) {
      throw new AppError('Invalid notification priority', 400);
    }

    if (notification.isRead && !notification.readAt) {
      notification.readAt = new Date();
    }

    if (!notification.isRead) {
      notification.readAt = null;
    }

    await notification.save();

    return {
      success: true,
      notification: formatNotification(notification)
    };
  } catch (error) {
    throw error;
  }
};

const deleteNotification = async (user, notificationId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError('Invalid notification ID', 400);
    }

    const notification = await Notification.findOneAndDelete({ _id: notificationId, user: user._id });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    return {
      success: true,
      message: 'Notification deleted successfully'
    };
  } catch (error) {
    throw error;
  }
};

const markNotificationRead = async (user, notificationId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError('Invalid notification ID', 400);
    }

    const notification = await Notification.findOne({ _id: notificationId, user: user._id });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return {
      success: true,
      notification: formatNotification(notification)
    };
  } catch (error) {
    throw error;
  }
};

const markAllNotificationsRead = async (user) => {
  try {
    const result = await Notification.updateMany(
      { user: user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return {
      success: true,
      updated: result.modifiedCount || 0,
      message: `${result.modifiedCount || 0} notifications marked as read`
    };
  } catch (error) {
    throw error;
  }
};

const bulkNotificationAction = async (user, payload) => {
  try {
    const notificationIds = payload.notificationIds || payload.notification_ids || [];
    const action = payload.action;

    if (!['mark_read', 'mark_unread', 'delete'].includes(action)) {
      throw new AppError('Invalid action. Use mark_read, mark_unread, or delete', 400);
    }

    const baseQuery = { user: user._id };

    if (notificationIds.length) {
      const validIds = notificationIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (!validIds.length) {
        throw new AppError('No valid notification IDs provided', 400);
      }
      baseQuery._id = { $in: validIds };
    }

    if (action === 'delete') {
      const result = await Notification.deleteMany(baseQuery);
      return {
        success: true,
        deleted: result.deletedCount || 0,
        message: `${result.deletedCount || 0} notifications deleted`
      };
    }

    if (action === 'mark_read') {
      const result = await Notification.updateMany(baseQuery, {
        $set: { isRead: true, readAt: new Date() }
      });
      return {
        success: true,
        updated: result.modifiedCount || 0,
        message: `${result.modifiedCount || 0} notifications marked as read`
      };
    }

    const result = await Notification.updateMany(baseQuery, {
      $set: { isRead: false },
      $unset: { readAt: '' }
    });

    return {
      success: true,
      updated: result.modifiedCount || 0,
      message: `${result.modifiedCount || 0} notifications marked as unread`
    };
  } catch (error) {
    throw error;
  }
};

const getNotificationStats = async (user) => {
  try {
    const [totalCount, unreadCount, countsByType] = await Promise.all([
      Notification.countDocuments({ user: user._id }),
      Notification.countDocuments({ user: user._id, isRead: false }),
      Notification.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: '$notificationType',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      totalCount,
      unreadCount,
      readCount: totalCount - unreadCount,
      welcomeCount: 0,
      verificationCount: 0,
      securityCount: 0,
      listingCount: 0,
      messageCount: 0,
      promotionCount: 0,
      systemCount: 0
    };

    const verificationTypes = new Set([
      NOTIFICATION_TYPES.EMAIL_VERIFICATION,
      NOTIFICATION_TYPES.EMAIL_VERIFIED,
      NOTIFICATION_TYPES.PHONE_VERIFICATION,
      NOTIFICATION_TYPES.PHONE_VERIFIED,
      NOTIFICATION_TYPES.FACIAL_VERIFICATION,
      NOTIFICATION_TYPES.FACIAL_VERIFIED
    ]);

    const securityTypes = new Set([
      NOTIFICATION_TYPES.PASSWORD_RESET,
      NOTIFICATION_TYPES.PASSWORD_CHANGED,
      NOTIFICATION_TYPES.SECURITY_ALERT
    ]);

    const listingTypes = new Set([
      NOTIFICATION_TYPES.LISTING_CREATED,
      NOTIFICATION_TYPES.LISTING_APPROVED,
      NOTIFICATION_TYPES.LISTING_REJECTED
    ]);

    countsByType.forEach(({ _id: type, count }) => {
      if (!type) return;
      if (type === NOTIFICATION_TYPES.WELCOME) {
        stats.welcomeCount += count;
        return;
      }
      if (verificationTypes.has(type)) {
        stats.verificationCount += count;
        return;
      }
      if (securityTypes.has(type)) {
        stats.securityCount += count;
        return;
      }
      if (listingTypes.has(type)) {
        stats.listingCount += count;
        return;
      }
      if (type === NOTIFICATION_TYPES.MESSAGE_RECEIVED) {
        stats.messageCount += count;
        return;
      }
      if (type === NOTIFICATION_TYPES.PROMOTION) {
        stats.promotionCount += count;
        return;
      }
      stats.systemCount += count;
    });

    return {
      success: true,
      stats
    };
  } catch (error) {
    throw error;
  }
};

const getUnreadCount = async (user) => {
  try {
    const count = await Notification.countDocuments({ user: user._id, isRead: false });
    return {
      success: true,
      unreadCount: count
    };
  } catch (error) {
    throw error;
  }
};

const getRecentNotifications = async (user) => {
  try {
    const recentTime = new Date(Date.now() - 5 * 60 * 1000);

    const notifications = await Notification.find({
      user: user._id,
      createdAt: { $gte: recentTime },
      isRead: false
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const unreadTotal = await Notification.countDocuments({ user: user._id, isRead: false });

    return {
      success: true,
      notifications: notifications.map(formatNotification),
      count: notifications.length,
      unreadTotal
    };
  } catch (error) {
    throw error;
  }
};

const getAgentListingNotifications = async (user) => {
  try {
    if (user.role !== 'agent') {
      throw new AppError('Not authorized', 403);
    }

    const pendingPipeline = [
      { $match: { status: 'pending_review' } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category.slug',
          count: { $sum: 1 }
        }
      }
    ];

    const [pendingBreakdown, recentBreakdown] = await Promise.all([
      Listing.aggregate(pendingPipeline),
      Listing.aggregate([
        { $match: { status: 'pending_review', createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } } },
        ...pendingPipeline.slice(1)
      ])
    ]);

    const splitCounts = (breakdown) => breakdown.reduce((acc, item) => {
      if (typeof item._id === 'string' && /spare|part/i.test(item._id)) {
        acc.spareParts += item.count;
      } else {
        acc.vehicles += item.count;
      }
      return acc;
    }, { vehicles: 0, spareParts: 0 });

    const pendingCounts = splitCounts(pendingBreakdown);
    const recentCounts = splitCounts(recentBreakdown);

    const totalPending = pendingCounts.vehicles + pendingCounts.spareParts;
    const newListings = recentCounts.vehicles + recentCounts.spareParts;

    return {
      success: true,
      totalPending,
      newListings,
      vehiclePending: pendingCounts.vehicles,
      sparePartsPending: pendingCounts.spareParts,
      hasNew: newListings > 0
    };
  } catch (error) {
    throw error;
  }
};

const getNotificationPreferences = async (user) => {
  try {
    let preference = await NotificationPreference.findOne({ user: user._id });

    if (!preference) {
      preference = await NotificationPreference.create({ user: user._id });
    }

    return {
      success: true,
      preferences: preference.toJSON()
    };
  } catch (error) {
    throw error;
  }
};

const updateNotificationPreferences = async (user, data) => {
  try {
    let preference = await NotificationPreference.findOne({ user: user._id });

    if (!preference) {
      preference = new NotificationPreference({ user: user._id });
    }

    const fields = [
      'email_welcome',
      'email_verification',
      'email_security',
      'email_account_updates',
      'email_listing_updates',
      'email_messages',
      'email_promotions',
      'app_security',
      'app_account_updates',
      'app_listing_updates',
      'app_messages',
      'app_promotions'
    ];

    fields.forEach((field) => {
      if (data[field] !== undefined) {
        preference[field] = toBoolean(data[field]);
      } else {
        const camelField = field.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        if (data[camelField] !== undefined) {
          preference[field] = toBoolean(data[camelField]);
        }
      }
    });

    await preference.save();

    return {
      success: true,
      preferences: preference.toJSON()
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createNotification,
  listNotifications,
  getNotification,
  createNotificationForUser,
  updateNotification,
  deleteNotification,
  markNotificationRead,
  markAllNotificationsRead,
  bulkNotificationAction,
  getNotificationStats,
  getUnreadCount,
  getRecentNotifications,
  getAgentListingNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
};
