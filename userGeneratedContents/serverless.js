/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'userGeneratedContents',
  custom: {
    logRetentionInDays: 30,
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
    dev: {
      'us-east-1': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/dev-us',
        REACT_APP_API_URL: 'https://dev-api.aws.crowdaa.com/v1',
      },
    },
    preprod: {
      'eu-west-3': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/preprod-fr',
        REACT_APP_API_URL: 'https://preprod-api.aws.crowdaa.com/v1',
      },
    },
    prod: {
      'us-east-1': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/us',
        REACT_APP_API_URL: 'https://api.aws.crowdaa.com/v1',
      },
      'eu-west-3': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/fr',
        REACT_APP_API_URL: 'https://api-fr.aws.crowdaa.com/v1',
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
    memorySize: 128,
    timeout: 30,
    environment: {
      ...env,
      REACT_APP_DASHBOARD_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_DASHBOARD_URL}',
      REACT_APP_API_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_API_URL}',
    },
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
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    postUGC: {
      handler: 'handlers/postUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents',
            method: 'post',
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
        {
          http: {
            path: 'press/articles/userGeneratedContents',
            method: 'post',
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
    getAllUGC: {
      handler: 'handlers/getAllUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents',
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
    getUGC: {
      handler: 'handlers/getUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}',
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
    getChildrenUGC: {
      handler: 'handlers/getChildrenUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/children',
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
        {
          http: {
            path: 'press/articles/{id}/userGeneratedContents',
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
    patchUGC: {
      handler: 'handlers/patchUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}',
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
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    removeUGC: {
      handler: 'handlers/removeUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}',
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
    reportUGC: {
      handler: 'handlers/reportUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/report',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
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
    reportUGCUser: {
      handler: 'handlers/reportUserGeneratedContentUser.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/reportUser',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
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
    getReports: {
      handler: 'handlers/getUserGeneratedContentReports.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/reports',
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
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    reviewUGC: {
      handler: 'handlers/reviewUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/review',
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
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    notifyUGC: {
      handler: 'handlers/notifyUserGeneratedContents.default',
      events: [
        {
          http: {
            path: 'userGeneratedContents/{id}/notify',
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
    'serverless-export-env',
  ],
  package: {
    individually: true,
  },
  resources: {
    Outputs: {
      RestApiRootResourceUGCId: {
        Description: 'Api Gateway ugc ID',
        Value: {
          Ref: 'ApiGatewayResourceUsergeneratedcontents',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceUGCId',
        },
      },
      RestApiRootResourceUGCItemId: {
        Description: 'Api Gateway ugcItemIdVar ID',
        Value: {
          Ref: 'ApiGatewayResourceUsergeneratedcontentsIdVar',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceUGCItemId',
        },
      },
    },
  },
};
module.exports = serverlessConfiguration;
