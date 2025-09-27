const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Manage in-app notifications, delivery preferences, and read status.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "6500a0f8f35632001c1c182d"
 *         title:
 *           type: string
 *           example: "Listing approved"
 *         message:
 *           type: string
 *           example: "Your listing 2018 Toyota Corolla LE has been approved."
 *         notificationType:
 *           type: string
 *           example: "listing_approved"
 *         priority:
 *           type: string
 *           example: "normal"
 *         isRead:
 *           type: boolean
 *         readAt:
 *           type: string
 *           format: date-time
 *         extraData:
 *           type: object
 *           additionalProperties: true
 *         actionUrl:
 *           type: string
 *           format: uri
 *         actionText:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     NotificationCreateRequest:
 *       type: object
 *       required:
 *         - title
 *         - message
 *         - notificationType
 *       properties:
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         notificationType:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [low, normal, high]
 *         extraData:
 *           type: object
 *           additionalProperties: true
 *         actionUrl:
 *           type: string
 *         actionText:
 *           type: string
 *       example:
 *         title: "New bid received"
 *         message: "John Doe placed a new offer on your listing."
 *         notificationType: "listing_offer"
 *         priority: "high"
 *         extraData:
 *           listingId: "64f9bd4ea9e75c001a3c9bb1"
 *     NotificationPreferences:
 *       type: object
 *       additionalProperties:
 *         type: boolean
 *       example:
 *         email_messages: true
 *         email_promotions: false
 *         app_messages: true
 *     NotificationBulkActionRequest:
 *       type: object
 *       properties:
 *         action:
 *           type: string
 *           enum: [mark_read, delete]
 *         notificationIds:
 *           type: array
 *           items:
 *             type: string
 *       required:
 *         - action
 *         - notificationIds
 */

router.use(auth.required);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status.
 *     responses:
 *       200:
 *         description: Notifications retrieved.
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /api/v1/notifications/create:
 *   post:
 *     summary: Create a notification for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationCreateRequest'
 *     responses:
 *       201:
 *         description: Notification created.
 */
router.post('/create', notificationController.createNotification);

/**
 * @swagger
 * /api/v1/notifications/stats:
 *   get:
 *     summary: Get notification statistics for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification stats returned.
 */
router.get('/stats', notificationController.notificationStats);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved.
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/recent:
 *   get:
 *     summary: Get recent notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent notifications retrieved.
 */
router.get('/recent', notificationController.getRecentNotifications);

/**
 * @swagger
 * /api/v1/notifications/agent/listings:
 *   get:
 *     summary: Agent listing notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent listing notifications retrieved.
 */
router.get('/agent/listings', notificationController.getAgentListingNotifications);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Get notification delivery preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences returned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferences'
 */
router.get('/preferences', notificationController.getNotificationPreferences);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   put:
 *     summary: Update notification delivery preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferences'
 *     responses:
 *       200:
 *         description: Preferences updated.
 */
router.put('/preferences', notificationController.updateNotificationPreferences);

/**
 * @swagger
 * /api/v1/notifications/mark-all-read:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read.
 */
router.post('/mark-all-read', notificationController.markAllNotificationsRead);

/**
 * @swagger
 * /api/v1/notifications/bulk-action:
 *   post:
 *     summary: Perform bulk actions on notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationBulkActionRequest'
 *     responses:
 *       200:
 *         description: Bulk action completed.
 */
router.post('/bulk-action', notificationController.bulkNotificationAction);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/mark-read:
 *   post:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read.
 */
router.post('/:notificationId/mark-read', notificationController.markNotificationRead);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}:
 *   get:
 *     summary: Get a single notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification retrieved.
 */
router.get('/:notificationId', notificationController.getNotification);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}:
 *   put:
 *     summary: Update a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationCreateRequest'
 *     responses:
 *       200:
 *         description: Notification updated.
 */
router.put('/:notificationId', notificationController.updateNotification);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted.
 */
router.delete('/:notificationId', notificationController.deleteNotification);

module.exports = router;