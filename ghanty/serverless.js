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
    dev: {
      'us-east-1': {
        FID_APPS_ID: '',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME:
          'DevGhantyMyFidNotificationPlanner',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-dev-us-ghantyMyFidNotificationPlanner-role',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:ghanty-dev-ghantyMyFidNotificationPlanner',
      },
    },
    preprod: {
      'eu-west-3': {
        FID_APPS_ID: '',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME:
          'PreprodGhantyMyFidNotificationPlanner',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-preprod-fr-ghantyMyFidNotificationPlanner-role',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:ghanty-preprod-ghantyMyFidNotificationPlanner',
      },
    },
    prod: {
      'eu-west-3': {
        FID_APPS_ID: '2d33cf6c-bbc9-490e-bcfd-06eafd5a07ed',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME:
          'ProdGhantyMyFidNotificationPlanner',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-fr-ghantyMyFidNotificationPlanner-role',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:ghanty-prod-ghantyMyFidNotificationPlanner',
      },
      'us-east-1': {
        FID_APPS_ID: '',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME:
          'ProdGhantyMyFidNotificationPlanner',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-us-ghantyMyFidNotificationPlanner-role',
        MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:ghanty-prod-ghantyMyFidNotificationPlanner',
      },
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
      FID_APPS_ID:
        '${self:custom.${self:provider.stage}.${self:provider.region}.FID_APPS_ID}',
      MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME}',
      MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE}',
      MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE}',
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: '*',
          },

          // state machine
          {
            Effect: 'Allow',
            Action: ['states:CreateStateMachine', 'states:StartExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:630176884077:stateMachine:${self:custom.${self:provider.stage}.${self:provider.region}.MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME}',
          },
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource:
              '${self:custom.${self:provider.stage}.${self:provider.region}.MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE}',
          },
          {
            Effect: 'Allow',
            Action: ['states:StopExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:630176884077:execution:${self:custom.${self:provider.stage}.${self:provider.region}.MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME}:${self:provider.stage}*',
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
    // ghantyMyFidNotificationsTrigger: {
    //   handler: 'handlers/ghantyMyFidNotificationsTrigger.default',
    //   events: [
    //     {
    //       eventBridge: {
    //         schedule: 'cron(0 0 * * ? *)',
    //       },
    //     },
    //   ],
    // },
    // ghantyMyFidNotificationPlanner: {
    //   handler: 'handlers/ghantyMyFidNotificationPlanner.default',
    //   timeout: 600,
    // },
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
    getLastPurchasesQueue: {
      handler: 'handlers/getLastPurchasesQueue.default',
      timeout: 300,
      events: [
        {
          eventBridge: {
            schedule: 'cron(*/5 * * * ? *)',
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
