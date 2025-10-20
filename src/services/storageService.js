const crypto = require('crypto');
const path = require('path');
const slugify = require('slugify');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const env = require('../config/env');
const { s3Client, getBucket, getPublicBaseUrl } = require('../config/s3');
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_UPLOAD_ACL = env.aws.defaultAcl || 'public-read';

const extensionFromContentType = (contentType, originalName) => {
  if (originalName) {
    const ext = path.extname(originalName);
    if (ext) {
      return ext.toLowerCase();
    }
  }

  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'text/plain': '.txt'
  };

  if (!contentType) {
    return '';
  }

  return map[contentType.toLowerCase()] || '';
};

const buildObjectKey = ({ folder = env.aws.defaultPrefix || 'uploads', originalName, contentType }) => {
  const nameWithoutExt = originalName
    ? slugify(path.parse(originalName).name, { lower: true, strict: true })
    : 'file';

  const ext = extensionFromContentType(contentType, originalName);
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  const safeFolder = (folder || env.aws.defaultPrefix || 'uploads').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') || 'uploads';

  return `${safeFolder}/${nameWithoutExt}-${Date.now()}-${id}${ext}`;
};

const buildPublicUrl = (key) => {
  const base = getPublicBaseUrl();
  return `${base}/${key}`;
};

const uploadFile = async ({ buffer, contentType, originalName, folder, metadata = {}, acl, cacheControl }) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new AppError('Invalid file buffer provided for upload', 400);
  }

  const bucket = getBucket();
  const key = buildObjectKey({ folder, originalName, contentType });

  const sanitizedMetadata = Object.entries(metadata || {}).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    const safeKey = String(key).toLowerCase();
    acc[safeKey] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {});

  const params = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: sanitizedMetadata,
    ACL: acl || DEFAULT_UPLOAD_ACL
  };

  if (cacheControl) {
    params.CacheControl = cacheControl;
  }

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return {
    key,
    bucket,
    url: buildPublicUrl(key)
  };
};

const deleteFile = async (key) => {
  if (!key) {
    throw new AppError('Storage key is required', 400);
  }

  const bucket = getBucket();

  try {
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await s3Client.send(command);
  } catch (error) {
    const notFound = error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404;
    if (notFound) {
      return {
        success: true,
        deleted: false
      };
    }
    throw error;
  }

  return {
    success: true,
    deleted: true
  };
};

const getSignedGetUrl = async ({ key, expiresIn = 60 }) => {
  if (!key) {
    throw new AppError('Storage key is required', 400);
  }

  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return { url, expiresIn };
};

const getSignedUploadUrl = async ({ key, contentType, expiresIn = 60, acl }) => {
  if (!key) {
    throw new AppError('Storage key is required', 400);
  }

  const bucket = getBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ACL: acl || DEFAULT_UPLOAD_ACL
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return {
    url,
    expiresIn,
    key,
    bucket,
    resourceUrl: buildPublicUrl(key)
  };
};

const createPlannedKey = ({ folder = 'uploads', filename, contentType }) => {
  const key = buildObjectKey({ folder, originalName: filename, contentType });
  return {
    key,
    url: buildPublicUrl(key),
    bucket: getBucket()
  };
};

module.exports = {
  uploadFile,
  deleteFile,
  getSignedGetUrl,
  getSignedUploadUrl,
  createPlannedKey,
  buildPublicUrl
};