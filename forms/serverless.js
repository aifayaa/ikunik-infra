/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'forms',
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
    environment: '${file(../env.js)}',
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
  },
  functions: {
    postFormRegister: {
      handler: 'handlers/postFormRegister.default',
      events: [
        {
          http: {
            path: 'forms/register',
            method: 'post',
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
    // 20230526 : Temporary API for the vivatech event
    postFormRegisterVivatech: {
      handler: 'handlers/postFormRegisterVivatech.default',
      events: [
        {
          http: {
            path: 'forms/vivatech',
            method: 'post',
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
    postFormRegisterAffiliate: {
      handler: 'handlers/postFormRegisterAffiliate.default',
      events: [
        {
          http: {
            path: 'forms/affiliate',
            method: 'post',
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
    postFormRegisterIntegrator: {
      handler: 'handlers/postFormRegisterIntegrator.default',
      events: [
        {
          http: {
            path: 'forms/integrator',
            method: 'post',
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
    editFormRegister: {
      handler: 'handlers/editFormRegister.default',
      events: [
        {
          http: {
            path: 'forms/edit/{id}',
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
    getFormRegister: {
      handler: 'handlers/getFormRegister.default',
      events: [
        {
          http: {
            path: 'forms/get/{id}',
            method: 'get',
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
