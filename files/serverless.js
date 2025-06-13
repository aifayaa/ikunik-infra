/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'files',
  package: {
    patterns: [
      '!.git/**',
      '!docker-compose.yml',
      '!Dockerfile',
      '!package.json',
      '!package-lock.json',
      '!README.md',
    ],
  },
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 1536,
    timeout: 30,
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['s3:*'],
            Resource:
              'arn:aws:s3:::${self:provider.environment.S3_UPLOAD_BUCKET}/*',
          },
          {
            Effect: 'Allow',
            Action: ['s3:*'],
            Resource:
              'arn:aws:s3:::${self:provider.environment.S3_PICTURES_BUCKET}/*',
          },
          {
            Effect: 'Allow',
            Action: ['s3:*'],
            Resource:
              'arn:aws:s3:::${self:provider.environment.S3_VIDEOS_BUCKET}/*',
          },
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:GetObjectAttributes', 's3:PutObject'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.S3_APPS_RESSOURCES}/*',
              'arn:aws:s3:::${self:provider.environment.S3_APPS_PUBLIC_RESSOURCES}/*',
            ],
          },
          {
            Effect: 'Allow',
            Action: ['elastictranscoder:CreateJob'],
            Resource: '*',
          },
        ],
      },
    },
    environment: {
      ...env,
      EL_PIPELINE:
        '${self:custom.${self:provider.stage}.${self:provider.region}.EL_PIPELINE}',
      EL_PIPELINE_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.EL_PIPELINE_REGION}',
      S3_VIDEOS_BUCKET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_VIDEOS_BUCKET}',
      CDN_DOMAIN_NAME:
        '${self:custom.${self:provider.stage}.${self:provider.region}.CDN_DOMAIN_NAME}',
      S3_UPLOAD_BUCKET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_UPLOAD_BUCKET}',
      S3_PICTURES_BUCKET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_PICTURES_BUCKET}',
      S3_APPS_RESSOURCES:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_APPS_RESSOURCES}',
      S3_APPS_PUBLIC_RESSOURCES:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_APPS_PUBLIC_RESSOURCES}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    getUploadUrl: {
      handler: 'handlers/getUploadUrl.default',
      events: [
        {
          http: {
            path: 'files',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getSupportedFileFormats: {
      handler: 'handlers/getSupportedFileFormats.default',
      events: [
        {
          http: {
            path: 'files/formats',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            cors: true,
          },
        },
      ],
    },
    onFileCreated: {
      handler: 'handlers/onFileCreated.default',
      timeout: 600,
      events: [
        {
          s3: {
            bucket: '${self:provider.environment.S3_UPLOAD_BUCKET}',
            event: 's3:ObjectCreated:*',
            existing: true,
          },
        },
      ],
    },
    onVideoEncoded: {
      handler: 'handlers/onVideoEncoded.default',
      events: [
        {
          sns: 'video-stream-${self:provider.stage}',
        },
      ],
    },
    onVideoEncodeError: {
      handler: 'handlers/onVideoEncodeError.default',
      events: [
        {
          sns: 'video-stream-${self:provider.stage}-error',
        },
      ],
    },
    getResourcesUrls: {
      handler: 'handlers/getResourcesUrls.default',
      events: [
        {
          http: {
            path: 'files/resources/{action}',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getResourcesUrlsV2: {
      handler: 'handlers/getResourcesUrlsV2.default',
      events: [
        {
          http: {
            path: 'files/resources',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
            request: {
              parameters: {
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
  custom: {
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
    dev: {
      'us-east-1': {
        EL_PIPELINE: '1571641859135-b15oxn',
        EL_PIPELINE_REGION: 'us-east-1',
        S3_VIDEOS_BUCKET: 'video-stream-dev.crowdaa.com',
        CDN_DOMAIN_NAME: 'd2vivde2vsot4v.cloudfront.net',
        S3_UPLOAD_BUCKET: 'slsupload-dev',
        S3_PICTURES_BUCKET: 'crowdaa-pictures-dev',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-dev',
        S3_APPS_PUBLIC_RESSOURCES: 'us-apps-public-resources-dev',
      },
    },
    preprod: {
      'eu-west-3': {
        EL_PIPELINE: '1609825954482-wbbflt',
        EL_PIPELINE_REGION: 'eu-west-1',
        S3_VIDEOS_BUCKET: 'video-stream-preprod.crowdaa.com',
        CDN_DOMAIN_NAME: 'd2altfyur5witx.cloudfront.net',
        S3_UPLOAD_BUCKET: 'slsupload-preprod',
        S3_PICTURES_BUCKET: 'crowdaa-pictures-preprod',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-preprod',
        S3_APPS_PUBLIC_RESSOURCES: 'us-apps-public-resources-dev',
      },
    },
    prod: {
      'us-east-1': {
        EL_PIPELINE: '1571641895186-gemqrt',
        EL_PIPELINE_REGION: 'us-east-1',
        S3_VIDEOS_BUCKET: 'video-stream-prod.crowdaa.com',
        CDN_DOMAIN_NAME: 'd1tmdgml10ct6o.cloudfront.net',
        S3_UPLOAD_BUCKET: 'slsupload-prod',
        S3_PICTURES_BUCKET: 'crowdaa-pictures-prod',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources',
        S3_APPS_PUBLIC_RESSOURCES: 'us-apps-public-resources-prod',
      },
      'eu-west-3': {
        EL_PIPELINE: '1630391856362-90g5lx',
        EL_PIPELINE_REGION: 'eu-west-1',
        S3_VIDEOS_BUCKET: 'video-stream-prod-fr.crowdaa.com',
        CDN_DOMAIN_NAME: 'd3gi4cpq7lf81i.cloudfront.net',
        S3_UPLOAD_BUCKET: 'slsupload-prod-fr',
        S3_PICTURES_BUCKET: 'crowdaa-pictures-prod-fr',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-prod-fr',
        S3_APPS_PUBLIC_RESSOURCES: 'fr-apps-public-resources-prod',
      },
    },
  },
};
module.exports = serverlessConfiguration;
