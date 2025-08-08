/* eslint-disable no-template-curly-in-string */
module.exports = {
  ADMIN_APP: '${cf:api-v1-${self:provider.stage}.AdminApp}',
  APP_NAME_DEFAULT: 'crowdaa',
  APP_API_KEY_DEFAULT: 'nQ9ZO9DEgfaOzWY44Xu2J2uaPtP92t176PpBkdqu',
  AUTH_PASS: 'fL9lAwCNRO8O',
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
  MONGO_URL: '${cf:api-v1-${self:provider.stage}.MongoURL}',
  NODE_OPTIONS: '--enable-source-maps',
  REGION: '${self:provider.region}',
  S3_BUCKET: 'crowdaa-user-content',
  S3_BUCKET_TOS: 'crowdaa-tos',
  S3_BUCKET_TOS_HOST: 'https://tos.aws.crowdaa.com',
  S3_REGION: 'us-east-1',
  SMTP_FROM: 'noreply@aws.crowdaa.com',
  MONGODB_ENCRYPTION_KEY:
    '${ssm(us-east-1):/crowdaa_microservices/${self:provider.stage}/${self:provider.region}/mongodb/encryption-key}',
  SMTP_LOGIN: 'AKIAZFOLYEVWVZYZR2G4',
  SMTP_SERVER: 'email-smtp.eu-west-3.amazonaws.com:465',
  SMTP_SECURE: true,
  SMTP_PASSWORD: 'BBGD8qelikhe37q9ky+j2GfSExD82csZHtevvm+57jVH',
  SNS_KEY_ID: 'AKIAI3H2I7ZIK4ARL2NA',
  SNS_PLATFORM_ANDROID_ARN:
    'arn:aws:sns:us-west-2:630176884077:app/GCM/Crowdaa-android',
  SNS_PLATFORM_IOS_ARN:
    'arn:aws:sns:us-west-2:630176884077:app/APNS/Crowdaa-iosprod',
  SNS_REGION: 'us-west-2',
  SNS_SECRET: '0w8fSrKMg+IBRA1YeUoNy4Ytakr7HmBKOoeYThkD',
  SNS_TOPIC: 'arn:aws:sns:us-west-2:630176884077:crowdaa-test',
  STAGE: '${self:provider.stage}',
};
