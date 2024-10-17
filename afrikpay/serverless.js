/* eslint-disable no-template-curly-in-string */
const serverlessConfiguration = {
  service: 'afrikpay',
  custom: {
    logRetentionInDays: 30,
    prune: { automatic: true, number: 3 },
    'serverless-disable-request-validators': { action: 'delete' },
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
    },
    region:
      '${opt:region, file(../api-v1/serverless.js):custom.region.${self:provider.stage}, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    login: {
      handler: 'handlers/login.default',
      events: [
        {
          http: {
            path: 'afrikpay/login',
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
            path: 'afrikpay/register',
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
            path: 'afrikpay/account',
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
    // resetPassword: {
    //   handler: 'handlers/resetPassword.default',
    //   events: [
    //     {
    //       http: {
    //         path: 'afrikpay/resetPassword',
    //         method: 'put',
    //         cors: true,
    //         authorizer: {
    //           type: 'CUSTOM',
    //           authorizerId:
    //             '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
    //         },
    //       },
    //     },
    //   ],
    // },
  },
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-plugin-log-retention',
  ],
  package: { individually: true },
};

module.exports = serverlessConfiguration;
