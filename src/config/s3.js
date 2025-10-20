const { S3Client } = require('@aws-sdk/client-s3');
const env = require('./env');

const REQUIRED_ENV_FIELDS = [
  ['AWS_ACCESS_KEY_ID', env.aws.accessKeyId],
  ['AWS_SECRET_ACCESS_KEY', env.aws.secretAccessKey],
  ['AWS_STORAGE_BUCKET_NAME', env.aws.bucket],
  ['AWS_S3_REGION_NAME', env.aws.region]
];

const missingVars = REQUIRED_ENV_FIELDS
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length) {
  console.warn(`⚠️  Missing AWS S3 environment variables: ${missingVars.join(', ')}`);
}

const credentials = env.aws.accessKeyId && env.aws.secretAccessKey
  ? {
      accessKeyId: env.aws.accessKeyId,
      secretAccessKey: env.aws.secretAccessKey
    }
  : undefined;

const s3Client = new S3Client({
  region: env.aws.region,
  credentials
});

const ensureConfigured = () => {
  if (!env.aws.bucket || !env.aws.region) {
    throw new Error('AWS S3 is not properly configured. Please verify environment variables.');
  }
};

const getBucket = () => {
  ensureConfigured();
  return env.aws.bucket;
};

const getRegion = () => {
  ensureConfigured();
  return env.aws.region;
};

const getPublicBaseUrl = () => {
  ensureConfigured();
  return env.aws.publicBaseUrl;
};

module.exports = {
  s3Client,
  getBucket,
  getRegion,
  getPublicBaseUrl
};