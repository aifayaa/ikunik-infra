/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'advertisements',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    region: '${opt:region, "us-east-1"}',
    memorySize: 128,
    timeout: 30,
    environment: '${file(../env.js)}',
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    createAd: {
      handler: 'handlers/createAd.default',
      events: [
        {
          http: {
            path: 'advertisements',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
          },
        },
      ],
    },
    getAdCounters: {
      handler: 'handlers/getAdCounters.default',
      events: [
        {
          http: {
            path: 'advertisements/counters',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
          },
        },
      ],
    },
    updateAd: {
      handler: 'handlers/updateAd.default',
      events: [
        {
          http: {
            path: 'advertisements/{id}',
            method: 'patch',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
          },
        },
      ],
    },
    getAd: {
      handler: 'handlers/getAd.default',
      events: [
        {
          http: {
            path: 'advertisements/{id}',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
          },
        },
      ],
    },
    getAds: {
      handler: 'handlers/getAds.default',
      events: [
        {
          http: {
            path: 'advertisements',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
          },
        },
      ],
    },
    deleteAd: {
      handler: 'handlers/deleteAd.default',
      events: [
        {
          http: {
            path: 'advertisements/{id}',
            method: 'delete',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
          },
        },
      ],
    },
    incrementAdCounter: {
      handler: 'handlers/incrementAdCounter.default',
      events: [
        {
          http: {
            path: 'advertisements/{id}/displayed',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
          },
        },
        {
          http: {
            path: 'advertisements/{id}/clicked',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
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
