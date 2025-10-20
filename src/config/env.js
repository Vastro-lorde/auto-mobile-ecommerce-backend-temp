const path = require('path');
const dotenv = require('dotenv');

const ENV_PATH = process.env.ENV_FILE_PATH || path.join(__dirname, '../../.env');

dotenv.config({ path: ENV_PATH });

const isDefined = (value) => value !== undefined && value !== null && value !== '';

const getString = (name, defaultValue) => {
  const value = process.env[name];
  return isDefined(value) ? value : defaultValue;
};

const getNumber = (name, defaultValue) => {
  const value = process.env[name];

  if (!isDefined(value)) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const getBoolean = (name, defaultValue = false) => {
  const value = process.env[name];

  if (!isDefined(value)) {
    return defaultValue;
  }

  const normalized = value.toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const parseList = (value, fallback = []) => {
  if (!isDefined(value)) {
    return [...fallback];
  }

  const parts = value
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parts.length) {
    return [...fallback];
  }

  return parts;
};

const computeAwsPublicBaseUrl = ({ publicBaseUrl, customDomain, bucket, region }) => {
  if (isDefined(publicBaseUrl)) {
    return publicBaseUrl.replace(/\/$/, '');
  }

  if (isDefined(customDomain)) {
    return `https://${customDomain.replace(/\/$/, '')}`;
  }

  if (isDefined(bucket) && isDefined(region)) {
    if (region === 'us-east-1') {
      return `https://${bucket}.s3.amazonaws.com`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  return undefined;
};

const env = {};

env.nodeEnv = getString('NODE_ENV', 'development');
env.isProduction = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';
env.productName = getString('PRODUCT_NAME', 'Car-Ecommerce');

env.app = {
  port: getNumber('PORT', 5000),
  basePath: getString('API_BASE_PATH', '/api'),
  version: getString('API_VERSION', 'v1'),
  frontendUrl: getString('FRONTEND_URL', 'http://localhost:3000')
};

env.jwt = {
  secret: getString('JWT_SECRET', ''),
  expiresIn: getString('JWT_EXPIRES_IN', '7d')
};

env.database = {
  uri: getString('MONGODB_URI', ''),
  debug: getBoolean('MONGODB_DEBUG', false)
};

env.aws = {
  accessKeyId: getString('AWS_ACCESS_KEY_ID', ''),
  secretAccessKey: getString('AWS_SECRET_ACCESS_KEY', ''),
  bucket: getString('AWS_STORAGE_BUCKET_NAME', ''),
  region: getString('AWS_S3_REGION_NAME', ''),
  customDomain: getString('AWS_S3_CUSTOM_DOMAIN'),
  publicBaseUrl: getString('AWS_PUBLIC_BASE_URL'),
  defaultAcl: getString('AWS_DEFAULT_UPLOAD_ACL', 'public-read'),
  defaultPrefix: getString('AWS_DEFAULT_UPLOAD_PREFIX', 'uploads'),
  objectParameters: getString('AWS_S3_OBJECT_PARAMETERS')
};

env.aws.publicBaseUrl = computeAwsPublicBaseUrl(env.aws);

env.uploads = {
  maxFileSizeMb: getNumber('STORAGE_MAX_FILE_SIZE_MB', 15)
};

const defaultCorsOrigins = [
  env.app.frontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
   'https://car-ecommerce.com',
   'https://car-ecommerce.netlify.app',
   'https://techxon.car-ecommerce.com'
].filter(Boolean);

env.cors = {
  allowedOrigins: Array.from(new Set([...parseList(process.env.CORS_ALLOWED_ORIGINS, []), ...defaultCorsOrigins])),
  allowCredentials: getBoolean('CORS_ALLOW_CREDENTIALS', true),
  methods: parseList(process.env.CORS_METHODS, ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']),
  allowedHeaders: parseList(process.env.CORS_ALLOWED_HEADERS, ['Content-Type', 'Authorization', 'X-Requested-With'])
};

env.rateLimit = {
  windowMs: getNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  maxRequests: getNumber('RATE_LIMIT_MAX_REQUESTS', 100)
};

env.mail = {
  host: getString('EMAIL_HOST'),
  port: getNumber('EMAIL_PORT'),
  user: getString('EMAIL_HOST_USER'),
  password: getString('EMAIL_HOST_PASSWORD'),
  defaultFrom: getString('DEFAULT_FROM_EMAIL'),
  mailtrapApiKey: getString('MAILTRAP_API_KEY')
};

env.sms = {
  username: getString('SMS_USERNAME'),
  password: getString('SMS_PASSWORD'),
  laafficApiKey: getString('LAAFFIC_API_KEY'),
  laafficApiSecret: getString('LAAFFIC_API_SECRET'),
  laafficSenderId: getString('LAAFFIC_SENDER_ID'),
  appId: getString('SMS_APP_ID'),
  apiToken: getString('SMS_API_TOKEN')
};

env.google = {
  clientId: getString('GOOGLE_CLIENT_ID'),
  clientSecret: getString('GOOGLE_CLIENT_SECRET'),
  redirectUri: getString('GOOGLE_REDIRECT_URI'),
  oauthUrl: getString('GOOGLE_OAUTH_URL'),
  tokenUrl: getString('GOOGLE_TOKEN_URL'),
  userInfoUrl: getString('GOOGLE_USER_INFO_URL')
};

env.raw = process.env;

module.exports = Object.freeze(env);