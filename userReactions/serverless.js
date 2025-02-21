/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'userReactions',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    region: '${opt:region, "us-east-1"}',
    memorySize: 128,
    timeout: 30,
    environment: '${file(../env.js)}',
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
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
      restApiResources: {
        '/press/articles':
          '${cf:pressArticles-${self:provider.stage}.RestApiRootResourcePressId}',
        '/press/articles/{id}':
          '${cf:pressArticles-${self:provider.stage}.RestApiRootResourcePressArticlesId}',
        '/userGeneratedContents':
          '${cf:userGeneratedContents-${self:provider.stage}.RestApiRootResourceUGCId}',
        '/userGeneratedContents/{id}':
          '${cf:userGeneratedContents-${self:provider.stage}.RestApiRootResourceUGCItemId}',
      },
    },
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    pressArticleGetReactions: {
      handler: 'handlers/pressArticleGetReactions.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/reactions',
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
    pressArticleReact: {
      handler: 'handlers/pressArticleReact.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/reactions/{reaction}',
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
                  reaction: true,
                },
              },
            },
          },
        },
      ],
    },
    pressArticleView: {
      handler: 'handlers/pressArticleView.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/viewed',
            method: 'put',
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
    ugcView: {
      handler: 'handlers/ugcView.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/viewed',
            method: 'put',
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
    ugcGetReactions: {
      handler: 'handlers/ugcGetReactions.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/reactions',
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
    ugcReact: {
      handler: 'handlers/ugcReact.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/reactions/{reaction}',
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
                  reaction: true,
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
