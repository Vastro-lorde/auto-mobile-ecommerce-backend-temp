const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const storageController = require('../controllers/storageController');
const env = require('../config/env');

const router = express.Router();

const MAX_FILE_SIZE_MB = env.uploads.maxFileSizeMb;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024
  }
});

/**
 * @swagger
 * tags:
 *   name: Storage
 *   description: File storage operations powered by AWS S3
 */

/**
 * @swagger
 * /api/v1/storage/files:
 *   post:
 *     summary: Upload a file to storage via the API
 *     tags: [Storage]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 description: Target folder path within the bucket (default uploads)
 *               metadata:
 *                 type: string
 *                 description: JSON string of key/value metadata pairs to store with the object
 *               acl:
 *                 type: string
 *                 description: Optional ACL for the uploaded file
 *               cacheControl:
 *                 type: string
 *                 description: Optional Cache-Control header value
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Missing file or validation error
 */
router.post('/files', auth.required, upload.single('file'), storageController.uploadFile);

/**
 * @swagger
 * /api/v1/storage/signed-upload:
 *   post:
 *     summary: Generate a signed URL for direct browser uploads
 *     tags: [Storage]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Original filename used to derive the S3 key
 *               folder:
 *                 type: string
 *                 description: Target folder path within the bucket (default uploads)
 *               contentType:
 *                 type: string
 *                 description: MIME type of the file (recommended)
 *               expiresIn:
 *                 type: integer
 *                 description: Expiration time in seconds for the signed URL (default 300)
 *               acl:
 *                 type: string
 *                 description: Optional ACL for the uploaded file
 *               key:
 *                 type: string
 *                 description: Provide a custom object key (optional)
 *     responses:
 *       200:
 *         description: Signed upload URL generated
 */
router.post('/signed-upload', auth.required, storageController.generateSignedUploadUrl);

/**
 * @swagger
 * /api/v1/storage/signed-download:
 *   get:
 *     summary: Generate a signed URL for downloading a file
 *     tags: [Storage]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The S3 object key to download
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           description: Expiration time in seconds for the signed URL (default 300)
 *     responses:
 *       200:
 *         description: Signed download URL generated
 */
router.get('/signed-download', auth.required, storageController.generateSignedDownloadUrl);

/**
 * @swagger
 * /api/v1/storage/files:
 *   delete:
 *     summary: Delete a file from storage
 *     tags: [Storage]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *             properties:
 *               key:
 *                 type: string
 *                 description: The S3 object key to delete
 *     responses:
 *       200:
 *         description: File deleted or already absent
 */
router.delete('/files', auth.required, storageController.deleteFile);

module.exports = router;