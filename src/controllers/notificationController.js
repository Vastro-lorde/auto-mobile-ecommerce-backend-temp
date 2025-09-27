const { asyncHandler } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');

exports.getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(
    req.user,
    req.query,
    { page: req.query.page, limit: req.query.limit }
  );
  res.json(result);
});

exports.getNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotification(req.user, req.params.notificationId);
  res.json(result);
});

exports.createNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.createNotificationForUser(req.user, {
    title: req.body.title,
    message: req.body.message,
    notificationType: req.body.notificationType ?? req.body.notification_type,
    priority: req.body.priority,
    extraData: req.body.extraData ?? req.body.extra_data,
    actionUrl: req.body.actionUrl ?? req.body.action_url,
    actionText: req.body.actionText ?? req.body.action_text
  });

  res.status(201).json(result);
});

exports.updateNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.updateNotification(
    req.user,
    req.params.notificationId,
    req.body
  );
  res.json(result);
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(req.user, req.params.notificationId);
  res.json(result);
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markNotificationRead(req.user, req.params.notificationId);
  res.json(result);
});

exports.markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user);
  res.json(result);
});

exports.bulkNotificationAction = asyncHandler(async (req, res) => {
  const result = await notificationService.bulkNotificationAction(req.user, req.body);
  res.json(result);
});

exports.notificationStats = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotificationStats(req.user);
  res.json(result);
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user);
  res.json(result);
});

exports.getRecentNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getRecentNotifications(req.user);
  res.json(result);
});

exports.getAgentListingNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getAgentListingNotifications(req.user);
  res.json(result);
});

exports.getNotificationPreferences = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotificationPreferences(req.user);
  res.json(result);
});

exports.updateNotificationPreferences = asyncHandler(async (req, res) => {
  const result = await notificationService.updateNotificationPreferences(req.user, req.body);
  res.json(result);
});
