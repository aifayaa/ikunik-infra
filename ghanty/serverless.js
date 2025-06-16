/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'ghanty',
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
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: {
      ...env,
      NODE_OPTIONS: '--enable-source-maps',
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
    },
    region:
      '${opt:region, file(../api-v1/serverless.yml):custom.region.${self:provider.stage}, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    login: {
      handler: 'handlers/login.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/login',
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
    register: {
      handler: 'handlers/register.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/register',
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
    deleteAccount: {
      handler: 'handlers/deleteAccount.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/account',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    // Not used anymore in latest code, delete me in 30 days to be safe.
    getResetPasswordURL: {
      handler: 'handlers/getResetPasswordURL.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/getResetPasswordURL',
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
    resetPassword: {
      handler: 'handlers/resetPassword.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/resetPassword',
            method: 'put',
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
    ghantyGetCoupons: {
      handler: 'handlers/getCoupons.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/coupons',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    ghantyGetProfile: {
      handler: 'handlers/getProfile.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/profile',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    ghantyGetTransactions: {
      handler: 'handlers/getTransactions.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/transactions',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    ghantyGetProposals: {
      handler: 'handlers/getProposals.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/proposals',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    ghantyGetProposal: {
      handler: 'handlers/getProposal.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/proposal/{id}',
            method: 'get',
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
                },
              },
            },
          },
        },
      ],
    },
    ghantyUseProposal: {
      handler: 'handlers/useProposal.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/proposal/{id}',
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
                },
              },
            },
          },
        },
      ],
    },
    ghantyGetPersonalData: {
      handler: 'handlers/getPersonalData.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/personaldata',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    ghantyUpdatePersonalData: {
      handler: 'handlers/updatePersonalData.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/personaldata',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    ghantyGetMalls: {
      handler: 'handlers/getMalls.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/malls',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
          },
        },
      ],
    },
    ghantyGetBrands: {
      handler: 'handlers/getBrands.default',
      events: [
        {
          http: {
            path: 'ghanty/myfid/brands',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
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
  package: {
    individually: true,
  },
};
module.exports = serverlessConfiguration;
