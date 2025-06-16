/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'press',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
      restApiResources: {
        '/admin': '${cf:admin-${self:provider.stage}.RestApiRootResourceId}',
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    getPress: {
      handler: 'handler.handleGetPress',
      events: [
        {
          http: {
            path: 'press',
            method: 'get',
            cors: true,
          },
        },
      ],
    },
    getAdminPress: {
      handler: 'handler.handleAdminGetPress',
      events: [
        {
          http: {
            path: 'admin/press',
            method: 'get',
            cors: true,
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
  resources: {
    Outputs: {
      RestApiRootResourceId: {
        Description: 'Api Gateway press ID',
        Value: {
          Ref: 'ApiGatewayResourcePress',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceId',
        },
      },
      RestApiRootResourceAdminPressId: {
        Description: 'Api Gateway admin press ID',
        Value: {
          Ref: 'ApiGatewayResourceAdminPress',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceAdminPressId',
        },
      },
    },
  },
};
module.exports = serverlessConfiguration;
