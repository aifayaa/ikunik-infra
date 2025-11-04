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
            Action: ['mediaconvert:CreateJob', 'mediaconvert:TagResource'],
            Resource:
              'arn:aws:mediaconvert:${self:provider.environment.MEDIACONVERT_REGION}:630176884077:*',
          },
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource: '${self:provider.environment.MEDIACONVERT_ROLE_ARN}',
          },
        ],
      },
    },
    environment: {
      ...env,
      MEDIACONVERT_ROLE_ARN:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MEDIACONVERT_ROLE_ARN}',
      MEDIACONVERT_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MEDIACONVERT_REGION}',
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
    onMediaconvertDone: {
      handler: 'handlers/onMediaconvertDone.default',
      events: [
        {
          eventBridge: {
            pattern: {
              source: ['aws.mediaconvert'],
              'detail-type': ['MediaConvert Job State Change'],
              detail: {
                status: ['COMPLETE', 'ERROR', 'CANCELED'],
              },
            },
          },
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
        MEDIACONVERT_REGION: 'us-east-1',
        MEDIACONVERT_ROLE_ARN:
          'arn:aws:iam::630176884077:role/user-video-processing-mediaconvert-role-dev',
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
        MEDIACONVERT_REGION: 'eu-west-1',
        MEDIACONVERT_ROLE_ARN:
          'arn:aws:iam::630176884077:role/user-video-processing-mediaconvert-role-preprod',
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
        MEDIACONVERT_REGION: 'us-east-1',
        MEDIACONVERT_ROLE_ARN:
          'arn:aws:iam::630176884077:role/user-video-processing-mediaconvert-role-prod-us',
        S3_VIDEOS_BUCKET: 'video-stream-prod.crowdaa.com',
        CDN_DOMAIN_NAME: 'd1tmdgml10ct6o.cloudfront.net',
        S3_UPLOAD_BUCKET: 'slsupload-prod',
        S3_PICTURES_BUCKET: 'crowdaa-pictures-prod',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources',
        S3_APPS_PUBLIC_RESSOURCES: 'us-apps-public-resources-prod',
      },
      'eu-west-3': {
        MEDIACONVERT_REGION: 'eu-west-1',
        MEDIACONVERT_ROLE_ARN:
          'arn:aws:iam::630176884077:role/user-video-processing-mediaconvert-role-prod-fr',
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
