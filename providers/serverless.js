/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'providers',
  custom: {
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
        },
        'eu-west-3': {
          MERCHWP_LAMBDA_CREATE_WEBSITE:
            'crowdaa-hosting-env-prod-fr-website-deploy-function',
        },
      },
      preprod: {
        'eu-west-3': {
          MERCHWP_LAMBDA_CREATE_WEBSITE:
            'crowdaa-hosting-env-preprod-fr-website-deploy-function',
        },
      },
      dev: {
        'us-east-1': {
          MERCHWP_LAMBDA_CREATE_WEBSITE:
            'crowdaa-hosting-env-dev-us-website-deploy-function',
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
      MERCHWP_LAMBDA_CREATE_WEBSITE:
        '${self:custom.merchwp.${self:provider.stage}.${self:provider.region}.MERCHWP_LAMBDA_CREATE_WEBSITE}',
      MERCHWP_API_URL:
        'file(../api-v1/serverless.yml):custom.domains.${self:provider.stage}.${self:provider.region}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    region:
      '${opt:region, file(../api-v1/serverless.yml):custom.region.${self:provider.stage}, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource:
              'arn:aws:lambda:${self:provider.region}:630176884077:function:${self:provider.environment.MERCHWP_LAMBDA_CREATE_WEBSITE}',
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
    provMerchWPInitialize: {
      handler: 'handlers/merchwp/initialize.default',
      events: [
        {
          http: {
            path: 'providers/merchwp/initialize',
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
    'serverless-export-env',
  ],
  package: {
    individually: true,
  },
};
module.exports = serverlessConfiguration;
