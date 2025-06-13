/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'purchasableProducts',
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
    cronSubscriptionChecks: {
      handler: 'handlers/cronSubscriptionChecks.default',
      timeout: 900,
      events: [
        {
          eventBridge: {
            schedule: 'rate(1 hour)',
          },
        },
      ],
    },
    validatePurchase: {
      handler: 'handlers/validatePurchase.default',
      events: [
        {
          http: {
            path: 'purchasableProducts/validate',
            method: 'post',
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
    findPurchasableProduct: {
      handler: 'handlers/findPurchasableProduct.default',
      events: [
        {
          http: {
            path: 'purchasableProducts/',
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
    getPurchasableProduct: {
      handler: 'handlers/getPurchasableProduct.default',
      events: [
        {
          http: {
            path: 'purchasableProducts/{id}',
            method: 'get',
            cors: true,
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                },
              },
            },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
      ],
    },
    postPurchasableProduct: {
      handler: 'handlers/postPurchasableProduct.default',
      events: [
        {
          http: {
            path: 'purchasableProducts/',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
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
    patchPurchasableProduct: {
      handler: 'handlers/patchPurchasableProduct.default',
      events: [
        {
          http: {
            path: 'purchasableProducts/{id}',
            method: 'patch',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
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
    deletePurchasableProduct: {
      handler: 'handlers/deletePurchasableProduct.default',
      events: [
        {
          http: {
            path: 'purchasableProducts/{id}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
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
