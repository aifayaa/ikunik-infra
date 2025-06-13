/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'userBadges',
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
        REACT_APP_CROWD_SERVICE_URL: 'https://dev-crowd.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://dev-blog.crowdaa.com',
      },
    },
    preprod: {
      'eu-west-3': {
        REACT_APP_CROWD_SERVICE_URL: 'https://preprod-crowd.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://preprod-blog.crowdaa.com',
      },
    },
    prod: {
      'us-east-1': {
        REACT_APP_CROWD_SERVICE_URL: 'https://crowd.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog.crowdaa.com',
      },
      'eu-west-3': {
        REACT_APP_CROWD_SERVICE_URL: 'https://crowd-fr.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog-fr.crowdaa.com',
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
    environment: {
      ...env,
      REACT_APP_CROWD_SERVICE_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_CROWD_SERVICE_URL}',
      REACT_APP_PRESS_SERVICE_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_PRESS_SERVICE_URL}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    addUserBadge: {
      handler: 'handlers/addUserBadge.default',
      events: [
        {
          http: {
            path: 'userBadges',
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
    getSelfUserBadges: {
      handler: 'handlers/getSelfUserBadges.default',
      events: [
        {
          http: {
            path: 'userBadges/self',
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
    badgeSelfAdd: {
      handler: 'handlers/badgeSelfAdd.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}/self/add',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
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
    badgeSelfRequest: {
      handler: 'handlers/badgeSelfRequest.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}/self/request',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
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
    badgeSelfRemove: {
      handler: 'handlers/badgeSelfRemove.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}/self/remove',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
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
    getUserBadge: {
      handler: 'handlers/getUserBadge.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
    listUserBadges: {
      handler: 'handlers/listUserBadges.default',
      events: [
        {
          http: {
            path: 'userBadges',
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
    editUserBadge: {
      handler: 'handlers/editUserBadge.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
    deleteUserBadge: {
      handler: 'handlers/deleteUserBadge.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}',
            method: 'delete',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
    toggleUserBadgeToUser: {
      handler: 'handlers/toggleUserBadgeToUser.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}/user',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
    badgePurchase: {
      handler: 'handlers/badgePurchase.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}/purchase',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
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
    badgeCancelledPurchase: {
      handler: 'handlers/badgeCancelledPurchase.default',
      events: [
        {
          http: {
            path: 'userBadges/{id}/cancelledPurchase',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
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
};
module.exports = serverlessConfiguration;
