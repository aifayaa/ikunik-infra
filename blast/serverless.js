/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'blast',
  custom: {
    logRetentionInDays: 7,
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
    dev: {
      'us-east-1': {
        NOTIFICATION_STATE_MACHINE_NAME: 'DevSendNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-DevUsSendNotifications-role',
        MAILGUN_API_KEY: 'key-ee8f3c350f56cbe4002b9c00cce04769',
        MAILGUN_DOMAIN: 'sandboxe8ecbf94ba82415c9ce55b169129af2e.mailgun.org',
        ANDROID_PACKAGE_ID: 'com.crowdaa.free.www',
        IOS_APP_ID: 1074256465,
      },
    },
    preprod: {
      'eu-west-3': {
        NOTIFICATION_STATE_MACHINE_NAME: 'PreprodSendNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-PreprodFrSendNotifications-role',
        MAILGUN_API_KEY: 'key-ee8f3c350f56cbe4002b9c00cce04769',
        MAILGUN_DOMAIN: 'mg.crowdaa.com',
        ANDROID_PACKAGE_ID: 'com.crowdaa.free.www',
        IOS_APP_ID: 1074256465,
      },
    },
    prod: {
      'us-east-1': {
        NOTIFICATION_STATE_MACHINE_NAME: 'ProdSendNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-ProdUsSendNotifications-role',
        MAILGUN_API_KEY: 'key-ee8f3c350f56cbe4002b9c00cce04769',
        MAILGUN_DOMAIN: 'mg.crowdaa.com',
        ANDROID_PACKAGE_ID: 'com.crowdaa.free.www',
        IOS_APP_ID: 1074256465,
      },
      'eu-west-3': {
        NOTIFICATION_STATE_MACHINE_NAME: 'ProdSendNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-ProdFrSendNotifications-role',
        MAILGUN_API_KEY: 'key-ee8f3c350f56cbe4002b9c00cce04769',
        MAILGUN_DOMAIN: 'mg.crowdaa.com',
        ANDROID_PACKAGE_ID: 'com.crowdaa.free.www',
        IOS_APP_ID: 1074256465,
      },
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
  },
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 2048,
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['states:CreateStateMachine', 'states:StartExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:630176884077:stateMachine:${self:custom.${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_NAME}',
          },
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource:
              '${self:custom.${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_ROLE}',
          },
          {
            Effect: 'Allow',
            Action: ['states:StopExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:630176884077:execution:${self:custom.${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_NAME}:${self:provider.stage}*',
          },
        ],
      },
    },
    environment: {
      ...env,
      MAILGUN_API_KEY:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MAILGUN_API_KEY}',
      MAILGUN_DOMAIN:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MAILGUN_DOMAIN}',
      ANDROID_PACKAGE_ID:
        '${self:custom.${self:provider.stage}.${self:provider.region}.ANDROID_PACKAGE_ID}',
      IOS_APP_ID:
        '${self:custom.${self:provider.stage}.${self:provider.region}.IOS_APP_ID}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    blastEmail: {
      handler: 'handlers/blastEmail.default',
      timeout: 300,
    },
    blastNotification: {
      handler: 'handlers/blastNotif.default',
      timeout: 300,
    },
    blastText: {
      handler: 'handlers/blastText.default',
      timeout: 300,
    },
    pressBlastNotif: {
      handler: 'handlers/pressBlastNotif.default',
      timeout: 300,
    },
    removeBlastToken: {
      handler: 'handlers/removeBlastToken.default',
      timeout: 300,
    },
    sendNotifications: {
      handler: 'handlers/sendNotifications.default',
      timeout: 300,
    },
    queueNotifications: {
      handler: 'handlers/queueNotifications.default',
      timeout: 300,
    },
    unqueueNotifications: {
      handler: 'handlers/unqueueNotifications.default',
      timeout: 300,
    },
    getBlasts: {
      handler: 'handlers/getBlasts.default',
      events: [
        {
          http: {
            path: 'blasts',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    sendBlastUsersPush: {
      handler: 'handlers/sendBlastUsersPush.default',
      events: [
        {
          http: {
            path: 'blast/users/push',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
  package: {
    individually: true,
  },
};
module.exports = serverlessConfiguration;
