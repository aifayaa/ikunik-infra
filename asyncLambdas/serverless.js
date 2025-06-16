/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'asyncLambdas',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: '${file(../env.js)}',
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    networkRequest: {
      handler: 'handlers/networkRequest.default',
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
      timeout: 600,
    },
    sendEmailMailgun: {
      handler: 'handlers/sendEmailMailgun.default',
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
      timeout: 600,
    },
    sendEmailTemplate: {
      handler: 'handlers/sendEmailTemplate.default',
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
      timeout: 600,
    },
    rebuildUserMetricsView: {
      handler: 'handlers/rebuildUserMetricsView.default',
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
      timeout: 600,
    },
    userMetricsViewOnUserIdentify: {
      handler: 'handlers/userMetricsViewOnUserIdentify.default',
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
      timeout: 600,
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
    /* This is the internal network (used to call internal APIs like baserow) */
    vpcConfig: {
      'us-east-1': {
        securityGroupIds: ['sg-022c00c994d25c46e'],
        subnetIds: ['subnet-0eef72fa8d060da6e'],
      },
      'eu-west-3': {
        securityGroupIds: ['sg-05867825a09444a43'],
        subnetIds: ['subnet-0977176abc4c94459'],
      },
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
