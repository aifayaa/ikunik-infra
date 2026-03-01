/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'blockedContents',
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
  },
  functions: {
    blockContent: {
      handler: 'handlers/blockContent.default',
      events: [
        {
          http: {
            path: 'blockedContents/{type}/{id}/block',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            request: {
              parameters: {
                paths: {
                  id: true,
                  type: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    unblockContent: {
      handler: 'handlers/unblockContent.default',
      events: [
        {
          http: {
            path: 'blockedContents/{type}/{id}/unblock',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            request: {
              parameters: {
                paths: {
                  id: true,
                  type: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getMyBlockedContents: {
      handler: 'handlers/getMyBlockedContents.default',
      events: [
        {
          http: {
            path: 'blockedContents',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
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
  custom: {
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
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-plugin-log-retention',
  ],
};
module.exports = serverlessConfiguration;
