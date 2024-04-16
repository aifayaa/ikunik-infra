/* eslint-disable no-template-curly-in-string */

module.exports = {
  service: 'purchases',
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
    hasRecoverablePurchasesFor: {
      handler: 'handlers/hasRecoverablePurchasesFor.default',
      events: [
        {
          http: {
            path: 'purchases/hasRecoverablePurchasesFor/{id}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
      ],
    },
    recoverPurchasesFor: {
      handler: 'handlers/recoverPurchasesFor.default',
      events: [
        {
          http: {
            path: 'purchases/recoverPurchasesFor/{id}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
      ],
    },
  },
  plugins: [
    'serverless-webpack',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-export-env',
  ],
  custom: {
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
  },
  package: {
    individually: true,
  },
};
