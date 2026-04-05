/* eslint-disable no-template-curly-in-string */
module.exports = {
  ADMIN_APP: '${cf:api-v1-${self:provider.stage}.AdminApp}',
  APP_NAME_DEFAULT: 'crowdaa',
  APP_API_KEY_DEFAULT:
    '${ssm(us-east-1):/ikunik/${self:provider.stage}/${self:provider.region}/api-v1/app-api-key-default}',
  AUTH_PASS:
    '${ssm(us-east-1):/ikunik/${self:provider.stage}/${self:provider.region}/api-v1/auth-pass}',
  AUTH_SMTP: 'ssl0.ovh.net',
  AUTH_USER: 'services@crowdaa.com',
  BASEROW_URL: 'https://baserow.crowdaa.com',
  CROWDAA_FEES: 0.2,
  // be careful when referencing with file(): the resolution is relative to the file that imports this one
  DASHBOARD_V2_DOMAIN:
    '${file(../api-v1/serverless.js):custom.DASHBOARD_V2_DOMAIN.${self:provider.stage}}',
  // be careful when referencing with file(): the resolution is relative to the file that imports this one
  CROWDAA_REGION:
    '${file(../api-v1/serverless.js):custom.crowdaaRegion.${self:provider.stage}.${self:provider.region}}',
  DB_NAME: 'crowdaaDev',
  DEFAULT_LIMIT: 15,
  IOS_FEES: 0.3,
  MAILGUN_API_KEY: '${cf:api-v1-${self:provider.stage}.MailgunApiKey}',
  MAILGUN_DOMAIN: '${cf:api-v1-${self:provider.stage}.MailgunDomain}',
  MAILGUN_FROM: 'postmaster',
  MINIMUM_PAYOUT: 600,
  // Temporary legacy Atlas bridge for target infra validation.
  MONGO_URL:
    '${ssm(us-east-1):/ikunik/${self:provider.stage}/${self:provider.region}/api-v1/mongo-url}',
  NODE_OPTIONS: '--enable-source-maps',
  REGION: '${self:provider.region}',
  S3_BUCKET: 'ikunik-media-content-prod-us-670296240767',
  S3_BUCKET_TOS: 'ikunik-tos-prod-us-670296240767',
  S3_BUCKET_TOS_HOST:
    'https://ikunik-tos-prod-us-670296240767.s3.eu-west-3.amazonaws.com',
  S3_REGION: 'eu-west-3',
  SMTP_FROM: 'noreply@aws.crowdaa.com',
  MONGODB_ENCRYPTION_KEY:
    '${ssm(us-east-1):/crowdaa_microservices/${self:provider.stage}/${self:provider.region}/mongodb/encryption-key}',
  SMTP_LOGIN:
    '${ssm(us-east-1):/ikunik/${self:provider.stage}/${self:provider.region}/api-v1/smtp-login}',
  SMTP_SERVER: 'email-smtp.eu-west-3.amazonaws.com:465',
  SMTP_SECURE: true,
  SMTP_PASSWORD:
    '${ssm(us-east-1):/ikunik/${self:provider.stage}/${self:provider.region}/api-v1/smtp-password}',
  SNS_KEY_ID:
    '${ssm(us-east-1):/ikunik/${self:provider.stage}/${self:provider.region}/api-v1/sns-key-id}',
  SNS_PLATFORM_ANDROID_ARN:
    'arn:aws:sns:us-west-2:630176884077:app/GCM/Crowdaa-android',
  SNS_PLATFORM_IOS_ARN:
    'arn:aws:sns:us-west-2:630176884077:app/APNS/Crowdaa-iosprod',
  SNS_REGION: 'us-west-2',
  SNS_SECRET:
    '${ssm(us-east-1):/ikunik/${self:provider.stage}/${self:provider.region}/api-v1/sns-secret}',
  SNS_TOPIC: 'arn:aws:sns:us-west-2:630176884077:crowdaa-test',
  STAGE: '${self:provider.stage}',
};
