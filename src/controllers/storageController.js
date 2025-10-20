const { asyncHandler } = require('../middleware/errorHandler');
const storageService = require('../services/storageService');

const parseMetadata = (rawMetadata) => {
  if (!rawMetadata) {
    return {};
  }

  if (typeof rawMetadata === 'object') {
    return rawMetadata;
  }

  try {
    return JSON.parse(rawMetadata);
  } catch (error) {
    return {};
  }
};

exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file provided for upload'
    });
  }

  const result = await storageService.uploadFile({
    buffer: req.file.buffer,
    contentType: req.file.mimetype,
    originalName: req.file.originalname,
    folder: req.body?.folder,
    metadata: parseMetadata(req.body?.metadata),
    acl: req.body?.acl,
    cacheControl: req.body?.cacheControl
  });

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: result
  });
});

exports.generateSignedUploadUrl = asyncHandler(async (req, res) => {
  let expiresIn = Number(req.body?.expiresIn || req.body?.expires_in || 300);
  if (Number.isNaN(expiresIn) || expiresIn <= 0) {
    expiresIn = 300;
  }
  const contentType = req.body?.contentType || req.body?.content_type;
  const acl = req.body?.acl;

  let key = req.body?.key;

  if (!key) {
    const planned = storageService.createPlannedKey({
      folder: req.body?.folder,
      filename: req.body?.filename,
      contentType
    });
    key = planned.key;
  }

  const result = await storageService.getSignedUploadUrl({
    key,
    contentType,
    expiresIn,
    acl
  });

  res.json({
    success: true,
    message: 'Signed upload URL generated',
    data: result
  });
});

exports.generateSignedDownloadUrl = asyncHandler(async (req, res) => {
  const key = req.query.key || req.body?.key;
  const expiresParam = req.query.expiresIn || req.query.expires_in || req.body?.expiresIn || req.body?.expires_in || 300;

  if (!key) {
    return res.status(400).json({
      success: false,
      message: 'Storage key is required'
    });
  }

  const safeExpires = Number(expiresParam);
  const expires = Number.isNaN(safeExpires) || safeExpires <= 0 ? 300 : safeExpires;

  const result = await storageService.getSignedGetUrl({
    key,
    expiresIn: expires
  });

  res.json({
    success: true,
    message: 'Signed download URL generated',
    data: {
      ...result,
      key,
      expiresIn: expires
    }
  });
});

exports.deleteFile = asyncHandler(async (req, res) => {
  const key = req.body?.key || req.query?.key;

  if (!key) {
    return res.status(400).json({
      success: false,
      message: 'Storage key is required'
    });
  }

  const result = await storageService.deleteFile(key);

  res.json({
    success: true,
    message: result.deleted ? 'File deleted successfully' : 'File not found, no action taken',
    data: {
      key,
      ...result
    }
  });
});