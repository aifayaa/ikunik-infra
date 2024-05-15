/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'counters',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    region: '${opt:region, "us-east-1"}',
    memorySize: 128,
    timeout: 30,
    environment: '${file(../env.js)}',
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    updateDBCounter: {
      handler: 'handlers/updateDBCounter.default',
      timeout: 600,
    },
    updateDBCounters: {
      handler: 'handlers/updateDBCounters.default',
      timeout: 600,
    },
  },
  plugins: [
    'serverless-disable-request-validators',
    'serverless-webpack',
    'serverless-prune-plugin',
    'serverless-export-env',
  ],
  custom: {
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
  },
  package: {
    individually: true,
  },
};
module.exports = serverlessConfiguration;
