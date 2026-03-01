/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'websites',
  custom: {
    awsAccountId: '${aws:accountId}',
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
    merchwp: {
      prod: {
        'us-east-1': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-prod-us-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-prod-us-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-prod-us-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-prod-us-website-destroy-function',
        },
        'eu-west-3': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-prod-fr-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-prod-fr-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-prod-fr-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-prod-fr-website-destroy-function',
        },
      },
      preprod: {
        'eu-west-3': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-preprod-fr-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-preprod-fr-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-preprod-fr-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-preprod-fr-website-destroy-function',
        },
      },
      dev: {
        'us-east-1': {
          WEBSITES_LAMBDA_UPDATE_DOMAINS:
            'crowdaa-hosting-env-dev-us-update-website-domains-function',
          WEBSITES_LAMBDA_GET_STATUS:
            'crowdaa-hosting-env-dev-us-website-status-function',
          WEBSITES_LAMBDA_START_STOP:
            'crowdaa-hosting-env-dev-us-set-website-state-function',
          WEBSITES_LAMBDA_DESTROY:
            'crowdaa-hosting-env-dev-us-website-destroy-function',
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
    deploymentBucket:
      '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: [
              'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:${self:provider.environment.WEBSITES_LAMBDA_UPDATE_DOMAINS}',
              'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:${self:provider.environment.WEBSITES_LAMBDA_GET_STATUS}',
              'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:${self:provider.environment.WEBSITES_LAMBDA_START_STOP}',
              'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:${self:provider.environment.WEBSITES_LAMBDA_DESTROY}',
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
    'serverless-plugin-log-retention',
    'serverless-export-env',
  ],
  package: {
    individually: true,
  },
};

module.exports = serverlessConfiguration;
