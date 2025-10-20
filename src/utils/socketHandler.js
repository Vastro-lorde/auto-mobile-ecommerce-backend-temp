const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const { Conversation } = require('../models/Conversation');

let ioInstance = null;
const userSockets = new Map();
const socketConversations = new Map();

const toConversationIdString = (conversationId) => {
  if (!conversationId) {
    return null;
  }

  if (typeof conversationId === 'string') {
    return conversationId;
  }

  if (conversationId instanceof mongoose.Types.ObjectId) {
    return conversationId.toString();
  }

  if (typeof conversationId.toString === 'function') {
    return conversationId.toString();
  }

  return null;
};

const toUserIdString = (userId) => {
  if (!userId) {
    return null;
  }

  return typeof userId === 'string' ? userId : userId.toString();
};

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.replace(/^Bearer\s+/i, '').trim();
  }

  const queryToken = socket.handshake?.query?.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  const headerToken = socket.handshake?.headers?.authorization;
  if (typeof headerToken === 'string' && headerToken.startsWith('Bearer ')) {
    return headerToken.slice(7).trim();
  }

  return null;
};

const registerSocket = (userId, socketId) => {
  const id = toUserIdString(userId);
  if (!id || !socketId) {
    return;
  }

  const existing = userSockets.get(id) || new Set();
  existing.add(socketId);
  userSockets.set(id, existing);
};

const removeSocket = (userId, socketId) => {
  const id = toUserIdString(userId);
  if (!id || !socketId) {
    return;
  }

  const sockets = userSockets.get(id);
  if (!sockets) {
    return;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    userSockets.delete(id);
  } else {
    userSockets.set(id, sockets);
  }
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance) {
    return false;
  }

  const id = toUserIdString(userId);
  if (!id) {
    return false;
  }

  const sockets = userSockets.get(id);
  if (!sockets || sockets.size === 0) {
    return false;
  }

  sockets.forEach((socketId) => {
    ioInstance.to(socketId).emit(event, payload);
  });

  return true;
};

const emitToUsers = (userIds, event, payload) => {
  if (!ioInstance) {
    return false;
  }

  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const uniqueIds = new Set(ids.map((id) => toUserIdString(id)).filter(Boolean));

  let emitted = false;

  uniqueIds.forEach((id) => {
    const result = emitToUser(id, event, payload);
    emitted = emitted || result;
  });

  return emitted;
};

const conversationRoom = (conversationId) => {
  const id = toConversationIdString(conversationId);
  return id ? `conversation:${id}` : null;
};

const emitConversationEvent = (conversationId, userIds, event, payload = {}) => {
  if (!ioInstance) {
    return false;
  }

  const id = toConversationIdString(conversationId);
  if (!id) {
    return false;
  }

  const room = conversationRoom(id);
  const data = { conversationId: id, ...payload };

  if (room) {
    ioInstance.to(room).emit(event, data);
  }

  emitToUsers(userIds, event, data);

  return true;
};

const emitNotificationCreated = (userId, notification) => {
  emitToUser(userId, 'notifications:new', { notification });
};

const emitNotificationUpdated = (userId, notification) => {
  emitToUser(userId, 'notifications:updated', { notification });
};

const emitNotificationDeleted = (userId, notificationId) => {
  emitToUser(userId, 'notifications:deleted', { notificationId });
};

const emitNotificationsRefresh = (userId, payload = {}) => {
  emitToUser(userId, 'notifications:refresh', payload);
};

const emitUnreadCount = (userId, count) => {
  emitToUser(userId, 'notifications:unreadCount', { count });
};

const emitConversationMessage = (conversationId, userIds, message, meta = {}) => {
  emitConversationEvent(conversationId, userIds, 'conversations:message', {
    message,
    ...meta
  });
};

const emitConversationUpdated = (conversationId, userIds, payload = {}) => {
  emitConversationEvent(conversationId, userIds, 'conversations:updated', payload);
};

const emitConversationRead = (conversationId, userIds, payload = {}) => {
  emitConversationEvent(conversationId, userIds, 'conversations:read', payload);
};

const ensureSocketConversationMap = (socketId) => {
  if (!socketConversations.has(socketId)) {
    socketConversations.set(socketId, new Set());
  }

  return socketConversations.get(socketId);
};

const init = (io) => {
  ioInstance = io;
  console.log('🔌 Socket.io server initialized');

  io.use(async (socket, next) => {
    try {
      const token = getTokenFromSocket(socket);
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('_id role isActive isSoftDeleted');

      if (!user || !user.isActive || user.isSoftDeleted) {
        return next(new Error('Authentication error'));
      }

      socket.data.userId = user._id.toString();
      socket.data.userRole = user.role;

      return next();
    } catch (error) {
      console.warn('Socket authentication failed:', error.message);
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data || {};

    if (!userId) {
      console.warn('Socket connected without user context. Disconnecting.');
      socket.disconnect(true);
      return;
    }

    registerSocket(userId, socket.id);
    socket.join(`user:${userId}`);

    console.log(`User ${userId} connected on socket ${socket.id}`);

    socket.emit('notifications:connected', {
      socketId: socket.id,
      userId
    });

    socket.on('conversations:join', async (rawConversationId, ack) => {
      try {
        const conversationId = toConversationIdString(rawConversationId);

        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
          throw new Error('Invalid conversation ID');
        }

        const conversation = await Conversation.findById(conversationId).select('participants').lean();

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        const participantMatch = conversation.participants.some((participant) => {
          if (!participant) {
            return false;
          }

          const participantId = participant.toString();
          return participantId === userId;
        });

        if (!participantMatch) {
          throw new Error('Not authorized to join conversation');
        }

        const room = conversationRoom(conversationId);
        if (room) {
          socket.join(room);
          ensureSocketConversationMap(socket.id).add(conversationId);
        }

        if (typeof ack === 'function') {
          ack({ success: true, conversationId });
        } else {
          socket.emit('conversations:joined', { conversationId });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ success: false, error: error.message });
        } else {
          socket.emit('conversations:joinError', { error: error.message });
        }
      }
    });

    socket.on('conversations:leave', (rawConversationId, ack) => {
      const conversationId = toConversationIdString(rawConversationId);
      const room = conversationRoom(conversationId);

      if (room) {
        socket.leave(room);
        const joined = socketConversations.get(socket.id);
        if (joined) {
          joined.delete(conversationId);
          if (!joined.size) {
            socketConversations.delete(socket.id);
          } else {
            socketConversations.set(socket.id, joined);
          }
        }
      }

      if (typeof ack === 'function') {
        ack({ success: true, conversationId });
      } else {
        socket.emit('conversations:left', { conversationId });
      }
    });

    socket.on('disconnect', (reason) => {
      removeSocket(userId, socket.id);

      const joined = socketConversations.get(socket.id);
      if (joined) {
        joined.forEach((conversationId) => {
          const room = conversationRoom(conversationId);
          if (room) {
            socket.leave(room);
          }
        });
        socketConversations.delete(socket.id);
      }

      console.log(`User ${userId} disconnected from socket ${socket.id} (${reason})`);
    });
  });
};

const getOnlineSockets = (userId) => {
  const id = toUserIdString(userId);
  if (!id) {
    return [];
  }

  const sockets = userSockets.get(id);
  return sockets ? Array.from(sockets) : [];
};

const getIo = () => ioInstance;

module.exports = {
  init,
  getIo,
  emitToUser,
  emitToUsers,
  emitNotificationCreated,
  emitNotificationUpdated,
  emitNotificationDeleted,
  emitNotificationsRefresh,
  emitUnreadCount,
  emitConversationMessage,
  emitConversationUpdated,
  emitConversationRead,
  getOnlineSockets
};