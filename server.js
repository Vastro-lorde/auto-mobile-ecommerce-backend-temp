const http = require('http');
const socketIo = require('socket.io');

const env = require('./src/config/env');
const express = require('express');

console.log('🔧 Environment check:');
console.log('NODE_ENV:', env.nodeEnv);
console.log('PORT:', env.app.port);
console.log('MONGODB_URI exists:', Boolean(env.database.uri));
console.log('JWT_SECRET exists:', Boolean(env.jwt.secret));

const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const socketHandler = require('./src/utils/socketHandler');

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: env.cors.allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: env.cors.allowCredentials
  }
});

// Handle Socket.io connections
socketHandler.init(io);

const PORT = env.app.port;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('📊 MongoDB connected successfully');
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Rejection:', err.message);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('❌ Uncaught Exception:', err.message);
  console.log('🛑 Shutting down the server due to uncaught exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('🔚 Process terminated!');
  });
});

startServer();