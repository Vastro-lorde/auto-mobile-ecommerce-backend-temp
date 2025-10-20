const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const {
  USER_ROLES,
  AGENT_DEPARTMENTS,
  AGENT_PERMISSION_LEVELS
} = require('../utils/enums/userEnums');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (hashed)
 *         role:
 *           type: string
 *           enum: [regular, dealer, corporate, agent, supervisor]
 *           description: User role
 *         isEmailVerified:
 *           type: boolean
 *           default: false
 *         isReadOnly:
 *           type: boolean
 *           default: false
 *         googleId:
 *           type: string
 *           description: Google OAuth ID
 *         isGoogleUser:
 *           type: boolean
 *           default: false
 *         profile:
 *           type: object
 *           description: User profile data (varies by role)
 *         isActive:
 *           type: boolean
 *           default: true
 *         deletedAt:
 *           type: string
 *           format: date-time
 *         deletionReason:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 120
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 120
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 30
  },
  avatar: String,
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.REGULAR
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isReadOnly: {
    type: Boolean,
    default: false
  },
  
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  googleEmail: String,
  googleName: String,
  googlePicture: String,
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  googleAccessToken: String,
  googleRefreshToken: String,
  googleIdToken: String,
  
  // Profile data (dynamic based on role)
  profile: {
    // Regular user profile
    firstName: String,
    lastName: String,
    phoneNumber: String,
    address: String,
    avatar: String,
    
    // Dealer profile
    businessName: String,
    
    // Corporate profile
    companyName: String,
    companyEmail: String,
    companyPhone: String,
    companyAddress: String,
    industry: String,
    companySize: String,
    website: String,
    
    // Agent profile
    department: {
      type: String,
      enum: Object.values(AGENT_DEPARTMENTS)
    },
    permissionLevel: {
      type: String,
      enum: Object.values(AGENT_PERMISSION_LEVELS)
    },
    employeeId: String
  },
  
  businessProfile: {
    businessName: String,
    businessAddress: String,
    businessPhone: String,
    businessEmail: String,
    website: String,
    cacNumber: String
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  statusReason: String,

  // Soft delete fields
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: Date,
  deletionReason: String,
  
  // Email verification
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Last login
  lastLogin: Date,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Additional indexes (email and google.id already have unique indexes)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name (regular users)
userSchema.virtual('fullName').get(function() {
  if (this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return null;
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  if (this.role === 'regular' && this.fullName) {
    return this.fullName;
  } else if (this.role === 'dealer' && this.profile?.businessName) {
    return this.profile.businessName;
  } else if (this.role === 'corporate' && this.profile?.companyName) {
    return this.profile.companyName;
  }
  return this.email;
});

// Virtual for soft delete status
userSchema.virtual('isSoftDeleted').get(function() {
  return this.deletedAt && !this.isActive;
});

// Virtual for days until permanent deletion
userSchema.virtual('daysUntilPermanentDeletion').get(function() {
  if (!this.isSoftDeleted) return null;
  
  const permanentDeletionDate = new Date(this.deletedAt);
  permanentDeletionDate.setDate(permanentDeletionDate.getDate() + 14);
  
  const now = new Date();
  const diffTime = permanentDeletionDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run if password was modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Alias for legacy comparePassword usage
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT auth token
userSchema.methods.generateAuthToken = function() {
  if (!env.jwt.secret) {
    throw new Error('JWT secret is not configured. Set JWT_SECRET in your environment variables.');
  }

  return jwt.sign(
    { id: this._id },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

// Instance method to soft delete user
userSchema.methods.softDelete = function(reason = 'user_requested') {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletionReason = reason;
  return this.save();
};

// Instance method to reactivate user
userSchema.methods.reactivate = function() {
  this.isActive = true;
  this.deletedAt = undefined;
  this.deletionReason = undefined;
  return this.save();
};

// Static method to find active users only
userSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: { $exists: false } });
};

// Static method to find by email (active users only)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    isActive: true, 
    deletedAt: { $exists: false } 
  });
};

module.exports = mongoose.model('User', userSchema);