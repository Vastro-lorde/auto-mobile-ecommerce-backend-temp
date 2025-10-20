const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    console.log('🔗 Attempting MongoDB connection...');
    console.log('📍 MongoDB URI:', env.database.uri ? 'Set' : 'NOT SET');
    
    if (!env.database.uri) {
      throw new Error('MongoDB connection string is missing. Set MONGODB_URI in your environment variables.');
    }

    if (env.database.debug) {
      mongoose.set('debug', true);
    }

    const conn = await mongoose.connect(env.database.uri);

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔚 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
};

module.exports = { connectDB };