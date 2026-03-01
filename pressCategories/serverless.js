/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'pressCategories',
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
      restApiResources: {
        '/press': '${cf:press-${self:provider.stage}.RestApiRootResourceId}',
        '/admin/press':
          '${cf:press-${self:provider.stage}.RestApiRootResourceAdminPressId}',
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource:
              'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:asyncLambdas-${self:provider.stage}-*',
          },
        ],
      },
    },
  },
  functions: {
    getCategories: {
      handler: 'handlers/getCategories.default',
      events: [
        {
          http: {
            path: 'press/categories',
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
    getChildrenCategories: {
      handler: 'handlers/getChildrenCategories.default',
      events: [
        {
          http: {
            path: 'press/categories/{id}/children',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
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
    getCategoriesAdmin: {
      handler: 'handlers/getCategoriesAdmin.default',
      events: [
        {
          http: {
            path: 'admin/press/categories',
            method: 'get',
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
    getCategory: {
      handler: 'handlers/getCategory.default',
      events: [
        {
          http: {
            path: 'press/categories/{id}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
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
    postCategory: {
      handler: 'handlers/postCategory.default',
      events: [
        {
          http: {
            path: 'press/categories',
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
    putCategory: {
      handler: 'handlers/putCategory.default',
      events: [
        {
          http: {
            path: 'press/categories/{id}',
            method: 'put',
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
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    reorderCategory: {
      handler: 'handlers/reorderCategory.default',
      events: [
        {
          http: {
            path: 'press/categories/{id}/order',
            method: 'put',
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
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    removeCategory: {
      handler: 'handlers/removeCategory.default',
      events: [
        {
          http: {
            path: 'press/categories/{id}',
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
                paths: {
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
