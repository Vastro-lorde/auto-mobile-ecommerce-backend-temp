const mongoose = require('mongoose');
const { Conversation, Message, MessageRead } = require('../models/Conversation');
const User = require('../models/User');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
} = require('../utils/enums/notificationEnums');
const notificationService = require('../services/notificationService');
const {
  emitConversationMessage,
  emitConversationUpdated,
  emitConversationRead
} = require('../utils/socketHandler');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const formatParticipant = (participantDoc) => {
  if (!participantDoc) {
    return null;
  }

  if (typeof participantDoc === 'string') {
    return {
      id: participantDoc,
      email: null,
      displayName: null,
      fullName: null,
      avatar: null,
      role: null
    };
  }

  const participant = participantDoc.toObject
    ? participantDoc.toObject({ virtuals: true })
    : participantDoc;

  const avatar = participant.profile?.avatar || participant.googlePicture || null;
  const displayName = participant.displayName || participant.fullName || participant.email || null;

  return {
    id: participant._id?.toString() || null,
    email: participant.email,
    displayName,
    fullName: participant.fullName || null,
    avatar,
    role: participant.role
  };
};

const formatMessage = (messageDoc, readSet, currentUserId) => {
  const message = messageDoc.toObject
    ? messageDoc.toObject({ virtuals: true })
    : messageDoc;

  const senderId = message.sender?._id
    ? message.sender._id.toString()
    : message.sender?.toString?.() || null;

  return {
    id: message._id?.toString() || null,
    conversation: message.conversation?.toString?.() || null,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    sender: formatParticipant(messageDoc.sender),
    isRead: senderId === currentUserId || readSet.has((message._id || message.id).toString())
  };
};

const safeEmit = (label, fn) => {
  try {
    fn();
  } catch (error) {
    console.warn(`${label} emit failed:`, error.message);
  }
};

const toParticipantIds = (participants = []) => participants
  .map((participant) => {
    if (!participant) {
      return null;
    }

    if (typeof participant === 'string') {
      return participant;
    }

    if (participant._id) {
      return participant._id.toString();
    }

    if (typeof participant.toString === 'function') {
      return participant.toString();
    }

    return null;
  })
  .filter(Boolean);

const buildConversationBroadcastPayload = (conversation) => {
  if (!conversation) {
    return null;
  }

  const lastMessage = Array.isArray(conversation.messages) && conversation.messages.length
    ? conversation.messages[0]
    : null;

  return {
    id: conversation.id,
    participants: conversation.participants,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessage
  };
};

const aggregateConversationSummaries = async (userId, search) => {
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate({
      path: 'participants',
      select: 'email role profile googlePicture displayName fullName'
    })
    .exec();

  if (!conversations.length) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation._id);

  const lastMessages = await Message.aggregate([
    { $match: { conversation: { $in: conversationIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversation',
        messageId: { $first: '$_id' },
        content: { $first: '$content' },
        createdAt: { $first: '$createdAt' },
        sender: { $first: '$sender' }
      }
    }
  ]);

  const lastMessageMap = new Map();
  lastMessages.forEach((item) => {
    lastMessageMap.set(item._id.toString(), {
      id: item.messageId.toString(),
      content: item.content,
      createdAt: item.createdAt,
      senderId: item.sender
    });
  });

  const unreadAggregates = await Message.aggregate([
    {
      $match: {
        conversation: { $in: conversationIds },
        sender: { $ne: userId }
      }
    },
    {
      $lookup: {
        from: 'messagereads',
        let: { msgId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$message', '$$msgId'] },
                  { $eq: ['$user', userId] }
                ]
              }
            }
          }
        ],
        as: 'reads'
      }
    },
    { $match: { reads: { $eq: [] } } },
    {
      $group: {
        _id: '$conversation',
        count: { $sum: 1 }
      }
    }
  ]);

  const unreadMap = new Map();
  unreadAggregates.forEach((item) => {
    unreadMap.set(item._id.toString(), item.count);
  });

  let messageMatchSet = null;
  let lowerSearch = null;

  if (search) {
    lowerSearch = search.toLowerCase();
    const matchingIds = await Message.distinct('conversation', {
      conversation: { $in: conversationIds },
      content: { $regex: search, $options: 'i' }
    });
    messageMatchSet = new Set(matchingIds.map((id) => id.toString()));
  }

  return conversations.reduce((acc, conversationDoc) => {
    const conversationId = conversationDoc._id.toString();

    const otherParticipantDoc = conversationDoc.participants.find((participant) => {
      const participantId = participant?._id?.toString();
      return participantId && participantId !== userId;
    });

    const otherParticipant = formatParticipant(otherParticipantDoc);

    const summary = {
      id: conversationId,
      otherParticipant,
      lastMessage: null,
      unreadCount: unreadMap.get(conversationId) || 0,
      updatedAt: conversationDoc.updatedAt
    };

    const lastMessage = lastMessageMap.get(conversationId);
    if (lastMessage) {
      summary.lastMessage = {
        id: lastMessage.id,
        content: lastMessage.content,
        createdAt: lastMessage.createdAt,
        senderId: lastMessage.senderId?.toString?.() || lastMessage.senderId || null
      };
    }

    if (lowerSearch) {
      let matches = false;

      if (messageMatchSet && messageMatchSet.has(conversationId)) {
        matches = true;
      }

      if (!matches && summary.lastMessage?.content) {
        matches = summary.lastMessage.content.toLowerCase().includes(lowerSearch);
      }

      if (!matches && otherParticipant) {
        const candidates = [
          otherParticipant.displayName,
          otherParticipant.fullName,
          otherParticipant.email
        ].filter(Boolean);
        matches = candidates.some((candidate) => candidate.toLowerCase().includes(lowerSearch));
      }

      if (!matches) {
        return acc;
      }
    }

    acc.push(summary);
    return acc;
  }, []);
};

const loadConversationDetail = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId)
    .populate({
      path: 'participants',
      select: 'email role profile googlePicture displayName fullName'
    })
    .exec();

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  const isParticipant = conversation.participants.some((participant) => {
    const participantId = participant?._id?.toString();
    return participantId === userId;
  });

  if (!isParticipant) {
    throw new AppError('Conversation not found', 404);
  }

  const messages = await Message.find({ conversation: conversation._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'sender',
      select: 'email role profile googlePicture displayName fullName'
    })
    .exec();

  const messageIds = messages.map((message) => message._id);
  const readMessageIds = await MessageRead.find({
    user: userId,
    message: { $in: messageIds }
  }).distinct('message');
  const readSet = new Set(readMessageIds.map((id) => id.toString()));

  return {
    id: conversation._id.toString(),
    participants: conversation.participants.map(formatParticipant),
    messages: messages.map((message) => formatMessage(message, readSet, userId)),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  };
};

exports.getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const conversations = await aggregateConversationSummaries(userId);
  const totalUnread = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);

  res.json({
    success: true,
    total: conversations.length,
    unreadTotal: totalUnread,
    conversations
  });
});

exports.searchConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const search = (req.query.q || req.query.search || '').trim();

  if (!search) {
    return res.json({
      success: true,
      total: 0,
      conversations: []
    });
  }

  const conversations = await aggregateConversationSummaries(userId, search);

  res.json({
    success: true,
    total: conversations.length,
    conversations
  });
});

exports.getConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { conversationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', 400);
  }

  const conversation = await loadConversationDetail(conversationId, userId);

  res.json({
    success: true,
    conversation
  });
});

exports.getConversationMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { conversationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', 400);
  }

  const conversation = await Conversation.findById(conversationId)
    .populate({ path: 'participants', select: '_id' })
    .exec();

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  const isParticipant = conversation.participants.some((participant) => participant._id.toString() === userId);
  if (!isParticipant) {
    throw new AppError('Conversation not found', 404);
  }

  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 50;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversation._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'sender',
        select: 'email role profile googlePicture displayName fullName'
      })
      .exec(),
    Message.countDocuments({ conversation: conversation._id })
  ]);

  const messageIds = messages.map((message) => message._id);
  const readMessageIds = await MessageRead.find({
    user: userId,
    message: { $in: messageIds }
  }).distinct('message');
  const readSet = new Set(readMessageIds.map((id) => id.toString()));

  res.json({
    success: true,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    },
    messages: messages.map((message) => formatMessage(message, readSet, userId))
  });
});

exports.startConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { recipient_id: bodyRecipientId, recipientId: camelRecipientId, message: initialMessage } = req.body;
  const recipientId = (bodyRecipientId || camelRecipientId || '').toString();

  if (!recipientId) {
    throw new AppError('recipient_id is required', 400);
  }

  if (recipientId === userId) {
    throw new AppError('Cannot start conversation with yourself', 400);
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new AppError('Recipient not found', 404);
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [userId, recipientId], $size: 2 }
  });

  let created = false;
  let initialFormattedMessage = null;
  const unreadChanges = {};

  if (!conversation) {
    conversation = await Conversation.create({ participants: [userId, recipientId] });
    created = true;
  }

  const participantIds = toParticipantIds(conversation.participants);

  if (initialMessage) {
    const messageDoc = await Message.create({
      conversation: conversation._id,
      sender: userId,
      content: initialMessage
    });
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(messageDoc._id)
      .populate({
        path: 'sender',
        select: 'email role profile googlePicture displayName fullName'
      })
      .exec();

    const readSet = new Set([messageDoc._id.toString()]);
    initialFormattedMessage = formatMessage(populatedMessage, readSet, userId);

    safeEmit('conversationMessage', () => {
      emitConversationMessage(
        conversation._id,
        participantIds,
        initialFormattedMessage,
        {
          senderId: userId,
          isInitial: true
        }
      );
    });

    participantIds.forEach((id) => {
      if (id !== userId) {
        unreadChanges[id] = (unreadChanges[id] || 0) + 1;
      }
    });

    try {
      await notificationService.createNotification({
        userId: recipientId,
        title: 'New message received',
        message: `${req.user.displayName || req.user.email} sent you a message`,
        notificationType: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        extraData: {
          conversationId: conversation._id.toString()
        }
      });
    } catch (error) {
      // Fail silently for notification creation
    }
  }

  const detailedConversation = await loadConversationDetail(conversation._id, userId);
  const broadcastConversation = buildConversationBroadcastPayload(detailedConversation);

  const updatePayload = {
    created,
    conversation: broadcastConversation,
    updatedAt: initialFormattedMessage?.createdAt || broadcastConversation?.updatedAt,
    lastMessage: initialFormattedMessage || broadcastConversation?.lastMessage || null
  };

  if (!updatePayload.conversation) {
    updatePayload.conversation = {
      id: conversation._id.toString(),
      participants: detailedConversation?.participants || [],
      createdAt: detailedConversation?.createdAt,
      updatedAt: detailedConversation?.updatedAt,
      lastMessage: updatePayload.lastMessage
    };
  }

  if (Object.keys(unreadChanges).length) {
    updatePayload.unreadChanges = unreadChanges;
  }

  safeEmit('conversationUpdated', () => {
    emitConversationUpdated(conversation._id, participantIds, updatePayload);
  });

  res.status(created ? 201 : 200).json({
    success: true,
    conversation: detailedConversation,
    created
  });
});

exports.createMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { conversation: conversationId, conversationId: altConversationId, content } = req.body;
  const targetConversationId = conversationId || altConversationId;

  if (!targetConversationId || !mongoose.Types.ObjectId.isValid(targetConversationId)) {
    throw new AppError('conversation is required', 400);
  }

  if (!content || !content.trim()) {
    throw new AppError('Message content is required', 400);
  }

  const conversation = await Conversation.findById(targetConversationId)
    .populate({ path: 'participants', select: '_id' })
    .exec();

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  const isParticipant = conversation.participants.some((participant) => participant._id.toString() === userId);
  if (!isParticipant) {
    throw new AppError('Conversation not found', 404);
  }

  const participantIds = toParticipantIds(conversation.participants);

  const message = await Message.create({
    conversation: conversation._id,
    sender: userId,
    content: content.trim()
  });

  await Conversation.findByIdAndUpdate(conversation._id, { updatedAt: new Date() });

  const populatedMessage = await Message.findById(message._id)
    .populate({
      path: 'sender',
      select: 'email role profile googlePicture displayName fullName'
    })
    .exec();

  const readSet = new Set([message._id.toString()]);

  const formatted = formatMessage(populatedMessage, readSet, userId);

  const unreadChanges = {};
  participantIds.forEach((id) => {
    if (id !== userId) {
      unreadChanges[id] = (unreadChanges[id] || 0) + 1;
    }
  });

  safeEmit('conversationMessage', () => {
    emitConversationMessage(conversation._id, participantIds, formatted, {
      senderId: userId
    });
  });

  const updatePayload = {
    lastMessage: formatted,
    updatedAt: formatted.createdAt
  };

  if (Object.keys(unreadChanges).length) {
    updatePayload.unreadChanges = unreadChanges;
  }

  safeEmit('conversationUpdated', () => {
    emitConversationUpdated(conversation._id, participantIds, updatePayload);
  });

  const recipientId = conversation.participants
    .map((participant) => participant._id.toString())
    .find((participantId) => participantId !== userId);

  if (recipientId) {
    try {
      await notificationService.createNotification({
        userId: recipientId,
        title: 'New message received',
        message: `${req.user.displayName || req.user.email} sent you a message`,
        notificationType: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        extraData: {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString()
        }
      });
    } catch (error) {
      // ignore notification errors
    }
  }

  res.status(201).json({
    success: true,
    message: formatted
  });
});

exports.markConversationRead = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { conversationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', 400);
  }

  const conversation = await Conversation.findById(conversationId)
    .populate({ path: 'participants', select: '_id' })
    .exec();

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  const isParticipant = conversation.participants.some((participant) => participant._id.toString() === userId);
  if (!isParticipant) {
    throw new AppError('Conversation not found', 404);
  }

  const participantIds = toParticipantIds(conversation.participants);

  const messages = await Message.find({
    conversation: conversation._id,
    sender: { $ne: userId }
  }).select('_id');

  if (!messages.length) {
    return res.json({
      success: true,
      markedCount: 0,
      status: 'No unread messages'
    });
  }

  const messageIds = messages.map((message) => message._id);

  const existingReads = await MessageRead.find({
    user: userId,
    message: { $in: messageIds }
  }).select('message');

  const existingSet = new Set(existingReads.map((item) => item.message.toString()));

  const unreadMessages = messageIds.filter((id) => !existingSet.has(id.toString()));

  if (unreadMessages.length) {
    const payload = unreadMessages.map((id) => ({
      message: id,
      user: userId
    }));

    try {
      await MessageRead.insertMany(payload, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  const markedIds = unreadMessages.map((id) => id.toString());
  const otherParticipantIds = participantIds.filter((participantId) => participantId !== userId);

  if (markedIds.length) {
    safeEmit('conversationRead', () => {
      emitConversationRead(conversation._id, otherParticipantIds, {
        readerId: userId,
        messageIds: markedIds,
        markedCount: unreadMessages.length
      });
    });

    const unreadChanges = { [userId]: -unreadMessages.length };
    const lastReadAt = new Date().toISOString();

    safeEmit('conversationUpdated', () => {
      emitConversationUpdated(conversation._id, participantIds, {
        unreadChanges,
        readerId: userId,
        markedCount: unreadMessages.length,
        lastReadAt
      });
    });
  }

  res.json({
    success: true,
    markedCount: unreadMessages.length,
    status: `${unreadMessages.length} messages marked as read`
  });
});
