/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'websites',
  custom: {
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
    merchwp: {
      prod: {
        'us-east-1': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-us-prod-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-us-prod-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-us-prod-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-us-prod-destroy-website-function',
        },
        'eu-west-3': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-fr-prod-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-fr-prod-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-fr-prod-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-fr-prod-destroy-website-function',
        },
      },
      preprod: {
        'eu-west-3': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-fr-preprod-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-fr-preprod-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-fr-preprod-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-fr-preprod-destroy-website-function',
        },
      },
      dev: {
        'us-east-1': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-us-dev-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-us-dev-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-us-dev-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-us-dev-destroy-website-function',
        },
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
      WEBSITES_LAMBDA_GET_STATUS:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_LAMBDA_GET_STATUS}',
      WEBSITES_LAMBDA_UPDATE_DOMAINS:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_LAMBDA_UPDATE_DOMAINS}',
      WEBSITES_LAMBDA_START_STOP:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_LAMBDA_START_STOP}',
      WEBSITES_LAMBDA_DESTROY:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_LAMBDA_DESTROY}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: [
              'arn:aws:lambda:${self:provider.region}:630176884077:function:${self:provider.environment.WEBSITES_LAMBDA_UPDATE_DOMAINS}',
              'arn:aws:lambda:${self:provider.region}:630176884077:function:${self:provider.environment.WEBSITES_LAMBDA_GET_STATUS}',
              'arn:aws:lambda:${self:provider.region}:630176884077:function:${self:provider.environment.WEBSITES_LAMBDA_START_STOP}',
              'arn:aws:lambda:${self:provider.region}:630176884077:function:${self:provider.environment.WEBSITES_LAMBDA_DESTROY}',
            ],
          },
        ],
      },
    },
  },
  functions: {
    getWebsiteStatus: {
      handler: 'handlers/getWebsiteStatus.default',
      events: [
        {
          http: {
            path: 'websites/{id}/status',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
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
    deleteWebsite: {
      handler: 'handlers/deleteWebsite.default',
      events: [
        {
          http: {
            path: 'websites/{id}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
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
    crowdaaSyncWPPluginAutoSetup: {
      handler: 'handlers/crowdaaSyncWPPluginAutoSetup.default',
      events: [
        {
          http: {
            path: 'websites/crowdaa-sync/autosetup',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
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
    'serverless-export-env',
  ],
  package: {
    individually: true,
  },
};

module.exports = serverlessConfiguration;
