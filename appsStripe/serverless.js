/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'appsStripe',
  custom: {
    logRetentionInDays: 30,
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
    dev: {
      'us-east-1': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/dev-us',
      },
    },
    preprod: {
      'eu-west-3': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/preprod-fr',
      },
    },
    prod: {
      'us-east-1': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/us',
      },
      'eu-west-3': {
        REACT_APP_DASHBOARD_URL: 'https://app.crowdaa.com/fr',
      },
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
    memorySize: 256, // Stripe seems to require more memory?? (random crashes with 128MB)
    timeout: 30,
    environment: {
      ...env,
      STRIPE_SECRET_KEY:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}/payment/stripe-secret-key}',
      STRIPE_WEBHOOK_SECRET_KEY:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}-${self:provider.region}/payment/webhook-secret-key}',
      STRIPE_PRICE_ID_PRO:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}/payment/stripe-price-id-pro}',
      STRIPE_TAX_RATE_ID_FR:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}/payment/stripe-tax-rate-id-fr}',
      STRIPE_TAX_RATE_ID_US:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}/payment/stripe-tax-rate-id-us}',
      BASEROW_API_ACCESS_TOKEN:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}/baserow/api-access-token}',
      REACT_APP_DASHBOARD_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_DASHBOARD_URL}',
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
            Action: ['lambda:InvokeFunction'],
            Resource: '*',
          },
        ],
      },
    },
  },
  functions: {
    stripeCheckout: {
      handler: 'handlers/postAppsIdCheckout.default',
      events: [
        {
          http: {
            path: 'apps/{id}/checkout',
            method: 'POST',
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
    stripeWebhook: {
      handler: 'handlers/postAppsWebhook.default',
      events: [
        {
          http: {
            path: 'apps/webhooks/stripe',
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
