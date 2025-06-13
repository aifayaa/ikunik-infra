/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'liveStream',
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
        IVS_REGION: 'us-east-1',
        IVS_BUCKET: 'live-streams-recordings-dev',
        MEDIACONVERT_IAM_ROLE_ARN:
          'arn:aws:iam::630176884077:role/live-streams-mediaconvert-role-dev',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'DevCheckLiveStreamDuration',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-dev-us-checkLiveStreamDuration-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:liveStream-dev-checkLiveStreamDuration',
      },
    },
    preprod: {
      'eu-west-3': {
        IVS_REGION: 'eu-west-1',
        IVS_BUCKET: 'live-streams-recordings-preprod',
        MEDIACONVERT_IAM_ROLE_ARN:
          'arn:aws:iam::630176884077:role/live-streams-mediaconvert-role-preprod',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME:
          'PreprodCheckLiveStreamDuration',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-preprod-fr-checkLiveStreamDuration-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:liveStream-preprod-checkLiveStreamDuration',
      },
    },
    prod: {
      'us-east-1': {
        IVS_REGION: 'us-east-1',
        IVS_BUCKET: 'live-streams-recordings',
        MEDIACONVERT_IAM_ROLE_ARN:
          'arn:aws:iam::630176884077:role/live-streams-mediaconvert-role-prod',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'ProdCheckLiveStreamDuration',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-us-checkLiveStreamDuration-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:liveStream-prod-checkLiveStreamDuration',
      },
      'eu-west-3': {
        IVS_REGION: 'eu-west-1',
        IVS_BUCKET: 'live-streams-recordings-prod-fr',
        MEDIACONVERT_IAM_ROLE_ARN:
          'arn:aws:iam::630176884077:role/live-streams-mediaconvert-role-prod-fr',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'ProdCheckLiveStreamDuration',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-fr-checkLiveStreamDuration-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:liveStream-prod-checkLiveStreamDuration',
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
      IVS_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.IVS_REGION}',
      IVS_BUCKET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.IVS_BUCKET}',
      MEDIACONVERT_IAM_ROLE_ARN:
        '${self:custom.${self:provider.stage}.${self:provider.region}.MEDIACONVERT_IAM_ROLE_ARN}',
      LIVE_STREAM_WATCHER_STATE_MACHINE_NAME:
        '${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_WATCHER_STATE_MACHINE_NAME}',
      LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
        '${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE}',
      LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
        '${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE}',
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['ivs:*'],
            Resource:
              'arn:aws:ivs:${self:provider.environment.IVS_REGION}:630176884077:*',
          },
          {
            Effect: 'Allow',
            Action: ['s3:GetBucketLocation', 's3:ListBucket', 's3:GetObject'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.IVS_BUCKET}',
              'arn:aws:s3:::${self:provider.environment.IVS_BUCKET}/*',
            ],
          },
          {
            Effect: 'Allow',
            Action: ['s3:CreateBucket', 's3:ListAllMyBuckets'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['servicequotas:ListServiceQuotas'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: [
              'iam:CreateServiceLinkedRole',
              'iam:AttachRolePolicy',
              'iam:PutRolePolicy',
            ],
            Resource:
              'arn:aws:iam::630176884077:role/aws-service-role/ivs.amazonaws.com/AWSServiceRoleForIVSRecordToS3*',
          },
          {
            Effect: 'Allow',
            Action: ['mediaconvert:GetJob', 'mediaconvert:CreateJob'],
            Resource:
              'arn:aws:mediaconvert:${self:provider.environment.IVS_REGION}:630176884077:*',
          },
          {
            Effect: 'Allow',
            Action: ['mediaconvert:DescribeEndpoints'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource: '${self:provider.environment.MEDIACONVERT_IAM_ROLE_ARN}',
          },

          // state machine
          {
            Effect: 'Allow',
            Action: ['states:CreateStateMachine', 'states:StartExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:630176884077:stateMachine:${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_WATCHER_STATE_MACHINE_NAME}',
          },
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource:
              '${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE}',
          },
          {
            Effect: 'Allow',
            Action: ['states:StopExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:630176884077:execution:${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_WATCHER_STATE_MACHINE_NAME}:${self:provider.stage}*',
          },
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource:
              'arn:aws:lambda:${self:provider.region}:630176884077:function:asyncLambdas-${self:provider.stage}-sendEmailMailgun',
          },
        ],
      },
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
    /* For IVS EventBridge events, see https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/eventbridge.html */
    onLiveStreamStateChanges: {
      handler: 'handlers/onLiveStreamStateChanges.default',
      timeout: 300,
      events: [
        {
          eventBridge: {
            pattern: {
              source: ['aws.ivs'],
              'detail-type': ['IVS Stream State Change'],
            },
          },
        },
      ],
    },
    checkLiveStreamDuration: {
      handler: 'handlers/checkLiveStreamDuration.default',
      timeout: 300,
    },
    expireLiveStreams: {
      handler: 'handlers/expireLiveStreams.default',
      timeout: 300,
      events: [
        {
          eventBridge: {
            schedule: 'rate(1 day)',
          },
        },
      ],
    },
    createLiveStream: {
      handler: 'handlers/createLiveStream.default',
      events: [
        {
          http: {
            path: 'liveStream',
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
    getLiveStreams: {
      handler: 'handlers/getLiveStreams.default',
      events: [
        {
          http: {
            path: 'liveStream',
            method: 'get',
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
    refreshLiveStream: {
      handler: 'handlers/refreshLiveStream.default',
      events: [
        {
          http: {
            path: 'liveStream/{id}/refresh',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
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
    convertLiveStreamRecording: {
      handler: 'handlers/convertLiveStreamRecording.default',
      events: [
        {
          http: {
            path: 'liveStream/{id}/recordingConvert',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
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
    updateLiveStream: {
      handler: 'handlers/updateLiveStream.default',
      events: [
        {
          http: {
            path: 'liveStream/{id}',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
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
    deleteLiveStream: {
      handler: 'handlers/deleteLiveStream.default',
      events: [
        {
          http: {
            path: 'liveStream/{id}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
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
    viewLiveStream: {
      handler: 'handlers/viewLiveStream.default',
      events: [
        {
          http: {
            path: 'liveStream/{id}/view',
            method: 'get',
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
    viewLiveStreamRecording: {
      handler: 'handlers/viewLiveStreamRecording.default',
      events: [
        {
          http: {
            path: 'liveStream/{id}/recording',
            method: 'get',
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
