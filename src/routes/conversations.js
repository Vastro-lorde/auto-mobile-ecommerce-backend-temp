const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: Manage user-to-user messaging threads and conversation messages.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ConversationParticipant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         displayName:
 *           type: string
 *         fullName:
 *           type: string
 *         avatar:
 *           type: string
 *           format: uri
 *         role:
 *           type: string
 *     ConversationSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ConversationParticipant'
 *         lastMessage:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             content:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *         unreadCount:
 *           type: integer
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         conversation:
 *           type: string
 *         content:
 *           type: string
 *         sender:
 *           $ref: '#/components/schemas/ConversationParticipant'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         isRead:
 *           type: boolean
 *     StartConversationRequest:
 *       type: object
 *       required:
 *         - recipientId
 *       properties:
 *         recipientId:
 *           type: string
 *           description: User ID of the conversation recipient.
 *         message:
 *           type: string
 *           description: Optional first message content.
 *       example:
 *         recipientId: "64fa0f6fdf0a63001f5d4c12"
 *         message: "Hi, I'm interested in your listing."
 *     MessageRequest:
 *       type: object
 *       required:
 *         - conversation
 *         - content
 *       properties:
 *         conversation:
 *           type: string
 *           description: Conversation ID.
 *         content:
 *           type: string
 *           description: Message text.
 *       example:
 *         conversation: "64fa1257df0a63001f5d4c77"
 *         content: "Is the vehicle still available?"
 */

router.use(auth.required);

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     summary: List conversations for the authenticated user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 unreadTotal:
 *                   type: integer
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConversationSummary'
 */
router.get('/', conversationController.getConversations);

/**
 * @swagger
 * /api/v1/conversations/search:
 *   get:
 *     summary: Search conversations by participant or message content
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search keyword.
 *     responses:
 *       200:
 *         description: Search results returned.
 */
router.get('/search', conversationController.searchConversations);

/**
 * @swagger
 * /api/v1/conversations/start:
 *   post:
 *     summary: Start a new conversation with another user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartConversationRequest'
 *     responses:
 *       201:
 *         description: Conversation created successfully.
 *       200:
 *         description: Conversation already existed and was returned.
 */
router.post('/start', conversationController.startConversation);

/**
 * @swagger
 * /api/v1/conversations/messages:
 *   post:
 *     summary: Send a message to an existing conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageRequest'
 *     responses:
 *       201:
 *         description: Message sent successfully.
 */
router.post('/messages', conversationController.createMessage);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get paginated messages for a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pagination:
 *                   type: object
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 */
router.get('/:conversationId/messages', conversationController.getConversationMessages);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/mark-read:
 *   post:
 *     summary: Mark all messages in a conversation as read
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation marked as read.
 */
router.post('/:conversationId/mark-read', conversationController.markConversationRead);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}:
 *   get:
 *     summary: Get a conversation with recent messages
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation retrieved.
 *       404:
 *         description: Conversation not found.
 */
router.get('/:conversationId', conversationController.getConversation);

module.exports = router;