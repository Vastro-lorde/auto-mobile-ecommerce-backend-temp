const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

let ioInstance = null;
const userSockets = new Map();

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

    socket.on('disconnect', (reason) => {
      removeSocket(userId, socket.id);
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
  emitNotificationCreated,
  emitNotificationUpdated,
  emitNotificationDeleted,
  emitNotificationsRefresh,
  emitUnreadCount,
  getOnlineSockets
};