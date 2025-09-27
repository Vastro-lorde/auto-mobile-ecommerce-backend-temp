const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Simple multer configuration for testing (local storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         displayName:
 *           type: string
 *         phone:
 *           type: string
 *         avatar:
 *           type: string
 *         role:
 *           type: string
 *           enum: [individual, dealer, corporate, agent, supervisor]
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         isEmailVerified:
 *           type: boolean
 *         businessProfile:
 *           type: object
 *         dateJoined:
 *           type: string
 *           format: date-time
 *         lastLogin:
 *           type: string
 *           format: date-time
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         businessProfile:
 *           type: object
 *           properties:
 *             businessName:
 *               type: string
 *             businessAddress:
 *               type: string
 *             businessPhone:
 *               type: string
 *             businessEmail:
 *               type: string
 *             website:
 *               type: string
 *             cacNumber:
 *               type: string
 */

// Get user profile
/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth.required, async (req, res) => {
  res.json({
    success: true,
    user: req.user.toJSON()
  });
});

// Update user profile
/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', auth.required, async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;
    
    // Fields that can be updated
    const allowedUpdates = [
      'firstName', 
      'lastName', 
      'phone', 
      'businessProfile'
    ];
    
    // Filter out non-allowed updates
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // Validate business profile for business accounts
    if (filteredUpdates.businessProfile && (user.role === 'dealer' || user.role === 'corporate')) {
      if (!filteredUpdates.businessProfile.businessName) {
        return res.status(400).json({
          success: false,
          message: 'Business name is required for business accounts'
        });
      }
      
      if (user.role === 'corporate' && !filteredUpdates.businessProfile.cacNumber) {
        return res.status(400).json({
          success: false,
          message: 'CAC number is required for corporate accounts'
        });
      }
    }

    // Apply updates
    Object.keys(filteredUpdates).forEach(key => {
      user[key] = filteredUpdates[key];
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload avatar
/**
 * @swagger
 * /api/v1/users/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (max 5MB)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Invalid file or file too large
 *       401:
 *         description: Unauthorized
 */
router.post('/avatar', auth.required, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    // For now, just return success without S3 upload
    // In production, this would upload to S3
    const user = req.user;
    user.avatar = `https://via.placeholder.com/150x150.png?text=${user.displayName.charAt(0)}`; // Placeholder
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully (demo mode)',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Avatar upload failed'
    });
  }
});

// Delete avatar
/**
 * @swagger
 * /api/v1/users/avatar:
 *   delete:
 *     summary: Delete user avatar
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/avatar', auth.required, async (req, res) => {
  try {
    const user = req.user;
    user.avatar = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('Avatar deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get public user profile (for viewing other users)
/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get public user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Public user profile retrieved
 *       404:
 *         description: User not found
 */
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ 
      id: req.params.userId,
      status: { $ne: 'suspended' }
    }).select('id firstName lastName displayName avatar role businessProfile dateJoined');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return public profile only
    const publicProfile = {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
      dateJoined: user.dateJoined
    };

    // Include business info for business accounts
    if (user.role === 'dealer' || user.role === 'corporate') {
      publicProfile.businessProfile = {
        businessName: user.businessProfile?.businessName,
        website: user.businessProfile?.website
      };
    }

    res.json({
      success: true,
      user: publicProfile
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Search users (for admin/supervisor only)
/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     summary: Search users (Admin/Supervisor only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name or email)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [individual, dealer, corporate, agent, supervisor]
 *         description: Filter by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/search', auth.role(['agent', 'supervisor']), async (req, res) => {
  try {
    const { q, role, status, page = 1, limit = 20 } = req.query;
    
    // Build search query
    const query = {};
    
    if (q) {
      query.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { 'businessProfile.businessName': { $regex: q, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);
    
    const users = await User.find(query)
      .select('id email firstName lastName displayName avatar role status businessProfile dateJoined lastLogin')
      .skip(skip)
      .limit(limitNum)
      .sort({ dateJoined: -1 });
      
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limitNum),
        count: users.length,
        totalUsers: total
      }
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user status (supervisor only)
/**
 * @swagger
 * /api/v1/users/{userId}/status:
 *   put:
 *     summary: Update user status (Supervisor only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               reason:
 *                 type: string
 *                 description: Reason for status change
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.put('/:userId/status', auth.role(['supervisor']), async (req, res) => {
  try {
    const { status, reason } = req.body;
    const userId = req.params.userId;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or suspended'
      });
    }
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Don't allow suspending other supervisors
    if (user.role === 'supervisor' && status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend another supervisor'
      });
    }
    
    user.status = status;
    if (reason) {
      user.statusReason = reason;
    }
    await user.save();
    
    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete account (soft delete)
/**
 * @swagger
 * /api/v1/users/account:
 *   delete:
 *     summary: Delete user account (soft delete)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/account', auth.required, async (req, res) => {
  try {
    const user = req.user;
    user.status = 'inactive';
    user.deletedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;