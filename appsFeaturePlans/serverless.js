/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'appsFeaturePlans',
  custom: {
    logRetentionInDays: 7,
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
    dev: {
      'us-east-1': {
        CROWDAA_REGION: 'us',
      },
    },
    preprod: {
      'eu-west-3': {
        CROWDAA_REGION: 'fr',
      },
    },
    prod: {
      'us-east-1': {
        CROWDAA_REGION: 'us',
      },
      'eu-west-3': {
        CROWDAA_REGION: 'fr',
      },
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
    stripeStage: {
      dev: 'dev',
      preprod: 'dev',
      prod: 'prod',
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
      CROWDAA_STAGE: '${self:provider.stage}',
      CROWDAA_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.CROWDAA_REGION}',
      STRIPE_PRICE_ID_PRO:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}/payment/stripe-price-id-pro}',
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
    deploymentBucket: 'ms-deployment-${self:provider.region}',
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.S3_BUCKET_TOS}/*',
            ],
          },
        ],
      },
    },
  },
  functions: {
    getCurrentPlan: {
      handler: 'handlers/getCurrentPlan.default',
      events: [
        {
          http: {
            path: 'apps/{id}/plans/current',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    setCurrentPlan: {
      handler: 'handlers/setCurrentPlan.default',
      events: [
        {
          http: {
            path: 'apps/{id}/plans',
            method: 'patch',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: {
                  Authorization: true,
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
  package: {
    individually: true,
  },
};

module.exports = serverlessConfiguration;
