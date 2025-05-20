/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'chat',
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
            Action: ['lambda:InvokeFunction'],
            Resource: '*',
          },
        ],
      },
    },
    environment: {
      ...env,
      FIREBASE_CHAT_SERVICE_ACCOUNT:
        '${ssm(us-east-1):/crowdaa_microservices/global/chat/firebase/service_account}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    getChatSession: {
      handler: 'handlers/getChatSession.default',
      events: [
        {
          http: {
            path: 'chat/user/session',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    chatMessageSent: {
      handler: 'handlers/chatMessageSent.default',
      events: [
        {
          http: {
            path: 'chat/message/sent',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
          },
        },
      ],
    },
    chatUserActivity: {
      handler: 'handlers/chatUserActivity.default',
      events: [
        {
          http: {
            path: 'chat/user/activity',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
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
    logRetentionInDays: 30,
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
