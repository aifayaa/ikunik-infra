/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'providers',
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
      CPME92_URL: 'https://www.cpme92.fr',
      CPME_CRED_PASS: '25969',
      CPME_CRED_USER: 'vigile@crowdaa.com',
      CPME_PATH_AUTH: '/ressources_adherents/access&return=RETURN_PATH_BASE64',
      CPME_URL: 'https://cpmereunion.re',
      LEQUOTIDIEN_ACCESS_CHECK_URI:
        '/crowdaa-sync/v1/lqr/article/validate-access',
      LEQUOTIDIEN_APP_ID: 'bce0f190-1bfb-46a7-a0e9-01e67f578621',
      LEQUOTIDIEN_AWS_KEY: 'AKIA4DV6YH4CUGEHOAQX',
      LEQUOTIDIEN_AWS_REGION: 'eu-west-3',
      LEQUOTIDIEN_AWS_SECRET: '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',
      LEQUOTIDIEN_BUCKET_PDF: 'lqr-pdf',
    },
    merchwp: {
      prod: {
        'us-east-1': {
          MERCHWP_LAMBDA_CREATE_WEBSITE:
            'crowdaa-hosting-env-prod-us-website-deploy-function',
          WEBSITES_DATABASE_HOST:
            'prod-us-shared-websites-database.cluster-cw8upw4ik27m.us-east-1.rds.amazonaws.com',
          WEBSITES_DATABASE_EXISTS: 'yes',
          WEBSITES_DATABASE_ARN:
            'arn:aws:rds:us-east-1:630176884077:cluster:prod-us-shared-websites-database',
          WEBSITES_DATABASE_CREDENTIALS_ARN:
            'arn:aws:secretsmanager:us-east-1:630176884077:secret:prod/us/shared_websites_database-4RSLyH',
          WEBSITES_DATABASE_IAM_PERM:
            'arn:aws:rds:us-east-1:630176884077:cluster:prod-us-shared-websites-database',
          WEBSITES_DATABASE_CREDENTIALS_IAM_PERM:
            'arn:aws:secretsmanager:us-east-1:630176884077:secret:prod/us/shared_websites_database-4RSLyH',
        },
        'eu-west-3': {
          MERCHWP_LAMBDA_CREATE_WEBSITE:
            'crowdaa-hosting-env-prod-fr-website-deploy-function',
          WEBSITES_DATABASE_HOST:
            'prod-fr-shared-websites-database.cluster-c7i8ynro0ztw.eu-west-3.rds.amazonaws.com',
          WEBSITES_DATABASE_EXISTS: 'yes',
          WEBSITES_DATABASE_ARN:
            'arn:aws:rds:eu-west-3:630176884077:cluster:prod-fr-shared-websites-database',
          WEBSITES_DATABASE_CREDENTIALS_ARN:
            'arn:aws:secretsmanager:eu-west-3:630176884077:secret:prod/fr/shared_websites_database-yAMDUI',
          WEBSITES_DATABASE_IAM_PERM:
            'arn:aws:rds:eu-west-3:630176884077:cluster:prod-fr-shared-websites-database',
          WEBSITES_DATABASE_CREDENTIALS_IAM_PERM:
            'arn:aws:secretsmanager:eu-west-3:630176884077:secret:prod/fr/shared_websites_database-yAMDUI',
        },
      },
      preprod: {
        'eu-west-3': {
          MERCHWP_LAMBDA_CREATE_WEBSITE:
            'crowdaa-hosting-env-preprod-fr-website-deploy-function',
          WEBSITES_DATABASE_EXISTS: 'no',
          // Do not exists, but serverless needs a variable anyway...
          WEBSITES_DATABASE_IAM_PERM:
            'arn:aws:rds:eu-west-3:630176884077:cluster:preprod-fr-shared-websites-database',
          WEBSITES_DATABASE_CREDENTIALS_IAM_PERM:
            'arn:aws:secretsmanager:eu-west-3:630176884077:secret:preprod/fr/shared_websites_database-abcdef',
        },
      },
      dev: {
        'us-east-1': {
          MERCHWP_LAMBDA_CREATE_WEBSITE:
            'crowdaa-hosting-env-dev-us-website-deploy-function',
          WEBSITES_DATABASE_EXISTS: 'no',
          // Do not exists, but serverless needs a variable anyway...
          WEBSITES_DATABASE_IAM_PERM:
            'arn:aws:rds:us-east-1:630176884077:cluster:dev-us-shared-websites-database',
          WEBSITES_DATABASE_CREDENTIALS_IAM_PERM:
            'arn:aws:secretsmanager:us-east-1:630176884077:secret:dev/us/shared_websites_database-abcdef',
        },
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
      CPME_CRED_PASS:
        '${self:custom.${self:provider.stage}.CPME_CRED_PASS, "NONE"}',
      CPME_CRED_USER:
        '${self:custom.${self:provider.stage}.CPME_CRED_USER, "NONE"}',
      CPME_PATH_AUTH:
        '${self:custom.${self:provider.stage}.CPME_PATH_AUTH, "NONE"}',
      CPME_URL: '${self:custom.${self:provider.stage}.CPME_URL, "NONE"}',
      CPME92_URL: '${self:custom.${self:provider.stage}.CPME92_URL, "NONE"}',
      LEQUOTIDIEN_APP_ID:
        '${self:custom.${self:provider.stage}.LEQUOTIDIEN_APP_ID, "NONE"}',
      LEQUOTIDIEN_AWS_KEY:
        '${self:custom.${self:provider.stage}.LEQUOTIDIEN_AWS_KEY, "NONE"}',
      LEQUOTIDIEN_AWS_REGION:
        '${self:custom.${self:provider.stage}.LEQUOTIDIEN_AWS_REGION, "NONE"}',
      LEQUOTIDIEN_AWS_SECRET:
        '${self:custom.${self:provider.stage}.LEQUOTIDIEN_AWS_SECRET, "NONE"}',
      LEQUOTIDIEN_BUCKET_PDF:
        '${self:custom.${self:provider.stage}.LEQUOTIDIEN_BUCKET_PDF, "NONE"}',
      FONTAWESOME_API_KEY:
        '${ssm(us-east-1):/crowdaa_microservices/global/fontawesome/api-key}',
      CLOUDFLARE_API_TOKEN:
        '${ssm(us-east-1):/crowdaa_microservices/global/cloudflare/api-token}',
      CLOUDFLARE_CROWDAA_DOT_COM_ZONE_ID: 'ee25cd95b6fd5c3d5c0485aad22bf00a',
      WEBSITES_TEMPLATES_BUCKET: 'crowdaa-hosting-common-templates',
      MERCHWP_LAMBDA_CREATE_WEBSITE:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.MERCHWP_LAMBDA_CREATE_WEBSITE}',
      WEBSITES_DATABASE_HOST:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_DATABASE_HOST, ""}',
      WEBSITES_DATABASE_ARN:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_DATABASE_ARN, ""}',
      WEBSITES_DATABASE_CREDENTIALS_ARN:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_DATABASE_CREDENTIALS_ARN, ""}',
      WEBSITES_DATABASE_EXISTS:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_DATABASE_EXISTS, ""}',
      MICROSERVICES_API_URL:
        'https://${file(../api-v1/serverless.js):custom.domains.${self:provider.stage}.${self:provider.region}}/v1',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    region:
      '${opt:region, file(../api-v1/serverless.js):custom.region.${self:provider.stage}, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: [
              'arn:aws:lambda:${self:provider.region}:630176884077:function:${self:provider.environment.MERCHWP_LAMBDA_CREATE_WEBSITE}',
              'arn:aws:lambda:${self:provider.region}:630176884077:function:asyncLambdas-${self:provider.stage}-*',
            ],
          },
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:GetObjectAttributes'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.WEBSITES_TEMPLATES_BUCKET}/*',
            ],
          },
          {
            Effect: 'Allow',
            Action: [
              'rds-data:ExecuteStatement',
              // 'rds-data:BatchExecuteStatement',
              // 'rds-data:BeginTransaction',
              // 'rds-data:CommitTransaction',
              // 'rds-data:RollbackTransaction',
            ],
            Resource: [
              // Variable may not be valid, but serverless needs a variable anyway...
              '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_DATABASE_IAM_PERM}',
            ],
          },
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue'],
            Resource: [
              // Variable may not be valid, but serverless needs a variable anyway...
              '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.WEBSITES_DATABASE_CREDENTIALS_IAM_PERM}',
            ],
          },
        ],
      },
    },
  },
  functions: {
    provCPMEGetWebsitePage: {
      handler: 'handlers/CPME/getWebsitePage.default',
      events: [
        {
          http: {
            path: 'providers/CPME/websitePage',
            method: 'get',
            cors: true,
          },
        },
      ],
    },
    provCPME92GetWebsitePage: {
      handler: 'handlers/CPME92/getWebsitePage.default',
      events: [
        {
          http: {
            path: 'providers/CPME92/websitePage',
            method: 'get',
            cors: true,
          },
        },
      ],
    },
    provLeQuotidienViewPdf: {
      handler: 'handlers/leQuotidien/viewPdf.default',
      events: [
        {
          http: {
            path: 'providers/lequotidien/viewpdf/{pdfId}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            request: {
              parameters: {
                paths: {
                  pdfId: true,
                },
              },
            },
          },
        },
      ],
    },
    provLeQuotidienValidateArticleAccess: {
      handler: 'handlers/leQuotidien/validateArticleAccess.default',
      events: [
        {
          http: {
            path: 'providers/lequotidien/validateArticleAccess',
            method: 'get',
            cors: true,
          },
        },
      ],
    },
    provFontAwesomeGetSessionToken: {
      handler: 'handlers/fontawesome/getSessionToken.default',
      events: [
        {
          http: {
            path: 'providers/fontawesome/sessionToken',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
          },
        },
      ],
    },
    provMerchWPSetupHandler: {
      handler: 'handlers/merchwp/setup.default',
      events: [
        {
          http: {
            path: 'providers/merchwp/{step}',
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
    provLeaderboardWPSetupHandler: {
      handler: 'handlers/leaderboardWpSetup.default',
      memorySize: 256, // Crashes with 128... Why??? It also happens with stripe...
      events: [
        {
          http: {
            path: 'providers/leaderboardwp/setup',
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
    provAdvCalendarGet: {
      handler: 'handlers/provAdvCalendarGet.default',
      events: [
        {
          http: {
            path: 'providers/adventcalendar/get',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
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
