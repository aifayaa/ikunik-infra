/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'pushNotifications',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: '${file(../env.js)}',
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'sns:CreatePlatformEndpoint',
              'sns:GetEndpointAttributes',
              'sns:DeleteEndpoint',
            ],
            Resource: [
              'arn:aws:sns:*:${self:custom.awsAccountId}:app/*/*',
              'arn:aws:sns:*:${self:custom.awsAccountId}:endpoint/*/*/*',
            ],
          },
        ],
      },
    },
  },
  functions: {
    registerDevice: {
      handler: 'handlers/registerDevice.default',
      events: [
        {
          http: {
            path: 'pushNotifications',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
              },
            },
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
  },
  package: {
    individually: true,
  },
};
module.exports = serverlessConfiguration;
