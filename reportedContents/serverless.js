/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'reportedContents',
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
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    reportContent: {
      handler: 'handlers/reportContent.default',
      events: [
        {
          http: {
            path: 'reportedContents/{type}/{id}/report',
            method: 'post',
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
    unreportContent: {
      handler: 'handlers/unreportContent.default',
      events: [
        {
          http: {
            path: 'reportedContents/{type}/{id}/unreport',
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
    getMyReportedContents: {
      handler: 'handlers/getMyReportedContents.default',
      events: [
        {
          http: {
            path: 'reportedContents',
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
