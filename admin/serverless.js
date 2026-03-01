/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'admin',
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
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
  },
  functions: {
    getAdmin: {
      handler: 'handler.handleGetAdmin',
      events: [
        {
          http: {
            path: 'admin',
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
        Description: 'Api Gateway admin ID',
        Value: {
          Ref: 'ApiGatewayResourceAdmin',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceId',
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
