const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Import routes
const { registerRoutes } = require('./routes');

// Import middleware
const globalErrorHandler = require('./middleware/errorHandler');
const { setupSwagger } = require('./config/swagger');
const env = require('./config/env');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (env.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: env.cors.allowCredentials,
  methods: env.cors.methods,
  allowedHeaders: env.cors.allowedHeaders
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(`${env.app.basePath}/`, limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Setup Swagger documentation
try {
  setupSwagger(app);
} catch (error) {
  console.error('Swagger setup failed:', error.message);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
  message: `${env.productName} API is running`,
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv
  });
});

// API Routes
registerRoutes(app);

// Handle undefined routes
app.all('*', (req, res, next) => {
  const error = new Error(`Can't find ${req.originalUrl} on this server!`);
  error.status = 'fail';
  error.statusCode = 404;
  next(error);
});

// Global error handling middleware (temporarily disabled for testing)
// app.use(globalErrorHandler);

module.exports = app;