const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    if (!env.jwt.secret) {
      return res.status(500).json({
        success: false,
        message: 'Authentication configuration error. JWT secret is missing.'
      });
    }

    const decoded = jwt.verify(token, env.jwt.secret);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is no longer valid. User not found.'
      });
    }
    
    // Check if user is active
    if (!user.isActive || user.isSoftDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated or deleted.'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    } else {
      return res.status(500).json({
        success: false,
  message: 'Authentication error.',
  error: env.nodeEnv === 'development' ? error.message : undefined
      });
    }
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      if (!env.jwt.secret) {
        return next();
      }

      const decoded = jwt.verify(token, env.jwt.secret);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive && !user.isSoftDeleted) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    
    next();
  };
};

// Check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required.'
    });
  }
  
  next();
};

// Check if user is not read-only
const requireWriteAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  
  if (req.user.isReadOnly) {
    return res.status(403).json({
      success: false,
      message: 'Account is in read-only mode. Contact support for assistance.'
    });
  }
  
  next();
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  if (!env.jwt.secret) {
    throw new Error('JWT secret is not configured.');
  }

  return jwt.verify(token, env.jwt.secret);
};

module.exports = {
  required: auth,
  optional: optionalAuth,
  role: authorize,
  requireVerification,
  requireWriteAccess,
  generateToken,
  verifyToken
};