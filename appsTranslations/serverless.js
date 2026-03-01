/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'appsTranslations',
  custom: {
    logRetentionInDays: 7,
    prune: { automatic: true, number: 3 },
    'serverless-disable-request-validators': { action: 'delete' },
    dev: {
      'us-east-1': {
        REACT_APP_AUTH_URL: 'https://dev-auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://dev-blog.crowdaa.com',
        CROWDAA_REGION: 'us',
      },
    },
    preprod: {
      'eu-west-3': {
        REACT_APP_AUTH_URL: 'https://depreprodv-auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://preprod-blog.crowdaa.com',
        CROWDAA_REGION: 'fr',
      },
    },
    prod: {
      'us-east-1': {
        REACT_APP_AUTH_URL: 'https://auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog.crowdaa.com',
        CROWDAA_REGION: 'us',
      },
      'eu-west-3': {
        REACT_APP_AUTH_URL: 'https://auth-fr.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog-fr.crowdaa.com',
        CROWDAA_REGION: 'fr',
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
      REACT_APP_AUTH_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_AUTH_URL}',
      REACT_APP_PRESS_SERVICE_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_PRESS_SERVICE_URL}',
      CROWDAA_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.CROWDAA_REGION}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
      restApiResources: {
        '/apps': '${cf:apps-${self:provider.stage}.RestApiRootResourceId}',
        '/apps/{id}':
          '${cf:apps-${self:provider.stage}.RestApiAppsIdResourceId}',
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
  },
  functions: {
    getAppTranslations: {
      handler: 'handlers/getAppTranslations.default',
      events: [
        {
          http: {
            path: 'apps/translations',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            request: {
              parameters: {
                headers: { Authorization: true },
              },
            },
          },
        },
        {
          http: {
            path: 'apps/{id}/translations',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    patchAppTranslations: {
      handler: 'handlers/patchAppTranslations.default',
      events: [
        {
          http: {
            path: 'apps/{id}/translations',
            method: 'patch',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: { Authorization: true },
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
};

module.exports = serverlessConfiguration;
