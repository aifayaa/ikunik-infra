// TODO: update merge conf plugin or change the mecanism to merge configuration files
// configValidationMode: error will be the next default with serverless v4
// configValidationMode: error
/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'ssr',
  configValidationMode: 'warn',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: {
      ...env,
      APPS_WEBSITE_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.APPS_WEBSITE_URL}',
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    article: {
      handler: 'handlers/article.default',
      events: [
        {
          http: {
            path: '/articles/{id}',
            method: 'get',
            request: {
              parameters: {
                querystrings: {
                  redirect_url: false,
                  appName: false,
                },
              },
            },
          },
        },
      ],
    },
    userArticle: {
      handler: 'handlers/userArticle.default',
      events: [
        {
          http: {
            path: '/userArticles/{id}',
            method: 'get',
            request: {
              parameters: {
                querystrings: {
                  redirect_url: false,
                  appName: false,
                },
              },
            },
          },
        },
      ],
    },
  },
  plugins: [
    'serverless-domain-manager',
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
  custom: {
    logRetentionInDays: 7,
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
    prod: {
      'us-east-1': {
        APPS_WEBSITE_URL: 'apps.crowdaa.com',
      },
      'eu-west-3': {
        APPS_WEBSITE_URL: 'apps-fr.crowdaa.com',
      },
    },
    dev: {
      'us-east-1': {
        APPS_WEBSITE_URL: 'dev-apps.crowdaa.com',
      },
    },
    preprod: {
      'eu-west-3': {
        APPS_WEBSITE_URL: 'preprod-apps.crowdaa.com',
      },
    },
    domains: {
      dev: {
        'us-east-1': 'dev-ssr.aws.crowdaa.com',
      },
      preprod: {
        'eu-west-3': 'preprod-ssr.aws.crowdaa.com',
      },
      prod: {
        'us-east-1': 'ssr.aws.crowdaa.com',
        'eu-west-3': 'ssr-fr.aws.crowdaa.com',
      },
    },
    customDomain: {
      domainName:
        '${self:custom.domains.${self:provider.stage}.${self:provider.region}}',
      stage: '${self:provider.stage}',
      createRoute53Record: true,
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
  },
};
module.exports = serverlessConfiguration;
