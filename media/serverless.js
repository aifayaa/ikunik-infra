/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'media',
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
    environment: '${file(../env.js)}',
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
  },
  functions: {
    checkUserMedia: {
      handler: 'handlers/checkUserMedia.default',
    },
    getMedium: {
      handler: 'handlers/getMedium.default',
      events: [
        {
          http: {
            path: 'media/{type}/{id}',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  type: true,
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    postMediumView: {
      handler: 'handlers/postMediumView.default',
      events: [
        {
          http: {
            path: 'media/{type}/{id}/views',
            method: 'post',
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
                paths: {
                  type: true,
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    getMediumLockState: {
      handler: 'handlers/getMediumLockState.default',
      events: [
        {
          http: {
            path: 'media/{type}/{id}/lock',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  type: true,
                  id: true,
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
