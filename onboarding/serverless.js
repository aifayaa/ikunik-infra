/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'onboarding',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    region: '${opt:region, "us-east-1"}',
    memorySize: 128,
    timeout: 30,
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:GetObjectAttributes'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.S3_APPS_RESSOURCES}/*',
            ],
          },
        ],
      },
    },
    environment: {
      ...env,
      S3_APPS_RESSOURCES:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_APPS_RESSOURCES}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
  },
  functions: {
    onboarding: {
      handler: 'handlers/onboarding.default',
      events: [
        {
          http: {
            path: 'onboarding',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            cors: true,
          },
        },
      ],
    },
  },
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-plugin-log-retention',
    'serverless-export-env',
  ],
  custom: {
    awsAccountId: '${aws:accountId}',
    logRetentionInDays: 7,
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
    dev: {
      'us-east-1': {
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-dev',
      },
    },
    preprod: {
      'eu-west-3': {
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-preprod',
      },
    },
    prod: {
      'us-east-1': {
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources',
      },
      'eu-west-3': {
        S3_APPS_RESSOURCES:
          '${env:ONBOARDING_S3_APPS_RESSOURCES_BUCKET, "crowdaa-apps-resources-prod-fr-${self:custom.awsAccountId}"}',
      },
    },
  },
  package: {
    individually: true,
  },
};
module.exports = serverlessConfiguration;
