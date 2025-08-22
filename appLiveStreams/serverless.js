/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'appLiveStreams',
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
        IVS_BUCKET: 'aals-live-streams-recordings-dev-us',
        LIVE_STREAM_LOGGING_CONFIGURATION_ARN:
          'arn:aws:ivschat:us-east-1:630176884077:logging-configuration/kpz9Hkhw0JZW',
        LIVE_STREAM_RECORDING_CONFIGURATION_ARN:
          'arn:aws:ivs:us-east-1:630176884077:storage-configuration/gGfB810FW5i7',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'DevSFNCheckAppLiveStream',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-dev-us-sfnCheckAppLiveStream-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:appLiveStreams-dev-sfnCheckAppLiveStream',
      },
    },
    preprod: {
      'eu-west-3': {
        IVS_REGION: 'eu-west-1',
        IVS_BUCKET: 'aals-live-streams-recordings-preprod-fr',
        LIVE_STREAM_LOGGING_CONFIGURATION_ARN:
          'arn:aws:ivschat:eu-west-1:630176884077:logging-configuration/npshJBdn8dLt',
        LIVE_STREAM_RECORDING_CONFIGURATION_ARN:
          'arn:aws:ivs:eu-west-1:630176884077:storage-configuration/GFhrn550Yngd',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'PreprodSFNCheckAppLiveStream',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-preprod-fr-sfnCheckAppLiveStream-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:appLiveStreams-preprod-sfnCheckAppLiveStream',
      },
    },
    prod: {
      'us-east-1': {
        IVS_REGION: 'us-east-1',
        IVS_BUCKET: 'aals-live-streams-recordings-prod-us',
        LIVE_STREAM_LOGGING_CONFIGURATION_ARN:
          'arn:aws:ivschat:us-east-1:630176884077:logging-configuration/APwRBhl1ukrr',
        LIVE_STREAM_RECORDING_CONFIGURATION_ARN:
          'arn:aws:ivs:us-east-1:630176884077:storage-configuration/yMAca4Tyd9Oj',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'ProdSFNCheckAppLiveStream',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-us-sfnCheckAppLiveStream-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:appLiveStreams-prod-sfnCheckAppLiveStream',
      },
      'eu-west-3': {
        IVS_REGION: 'eu-west-1',
        IVS_BUCKET: 'aals-live-streams-recordings-prod-fr',
        LIVE_STREAM_LOGGING_CONFIGURATION_ARN:
          'arn:aws:ivschat:eu-west-1:630176884077:logging-configuration/lDpG9UuoJpcB',
        LIVE_STREAM_RECORDING_CONFIGURATION_ARN:
          'arn:aws:ivs:eu-west-1:630176884077:storage-configuration/uMW5ndSoawyE',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'ProdSFNCheckAppLiveStream',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-fr-sfnCheckAppLiveStream-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:appLiveStreams-prod-sfnCheckAppLiveStream',
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

      // Recording
      IVS_BUCKET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.IVS_BUCKET}',
      LIVE_STREAM_RECORDING_CONFIGURATION_ARN:
        '${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_RECORDING_CONFIGURATION_ARN}',
      LIVE_STREAM_LOGGING_CONFIGURATION_ARN:
        '${self:custom.${self:provider.stage}.${self:provider.region}.LIVE_STREAM_LOGGING_CONFIGURATION_ARN}',

      // state machine
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
          // Streaming
          {
            Effect: 'Allow',
            Action: ['ivs:*'],
            Resource:
              'arn:aws:ivs:${self:provider.environment.IVS_REGION}:630176884077:*',
          },
          {
            Effect: 'Allow',
            Action: ['ivschat:*'],
            Resource:
              'arn:aws:ivschat:${self:provider.environment.IVS_REGION}:630176884077:*',
          },

          // Recording
          {
            Effect: 'Allow',
            Action: [
              'ivsrealtime:GetStorageConfiguration',
              'ivsrealtime:ListStorageConfigurations',
            ],
            Resource:
              'arn:aws:ivs:${self:provider.environment.IVS_REGION}:630176884077:*',
          },

          // Handling/Viewing replay
          {
            Effect: 'Allow',
            Action: ['s3:GetBucketLocation', 's3:ListBucket', 's3:GetObject'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.IVS_BUCKET}',
              'arn:aws:s3:::${self:provider.environment.IVS_BUCKET}/*',
            ],
          },

          // state machine / stream state checks
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

          // Notifications
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: [
              'arn:aws:lambda:${self:provider.region}:630176884077:function:blast-${self:provider.stage}-queueNotifications',
              'arn:aws:lambda:${self:provider.region}:630176884077:function:files-${self:provider.stage}-getUploadUrl',
              'arn:aws:lambda:${self:provider.region}:630176884077:function:pressArticles-${self:provider.stage}-postArticle',
            ],
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
    /* For IVS RT EventBridge events, see https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/eventbridge.html */
    onLiveStreamStateChanges: {
      handler: 'handlers/onLiveStreamStateChanges.default',
      timeout: 300,
      events: [
        {
          eventBridge: {
            pattern: {
              source: ['aws.ivs'],
              'detail-type': ['IVS Stage Update'],
            },
          },
        },
      ],
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
    sfnCheckAppLiveStream: {
      handler: 'handlers/sfnCheckAppLiveStream.default',
      timeout: 300,
      memorySize: 256,
    },
    createLiveStream: {
      handler: 'handlers/createLiveStream.default',
      events: [
        {
          http: {
            path: 'appLiveStreams',
            method: 'post',
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
    getLiveStreams: {
      handler: 'handlers/getLiveStreams.default',
      events: [
        {
          http: {
            path: 'appLiveStreams',
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
    deleteLiveStream: {
      handler: 'handlers/deleteLiveStream.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
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
    watchLiveStream: {
      handler: 'handlers/watchLiveStream.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}/watch',
            method: 'post',
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
    refreshLiveStreamRecordings: {
      handler: 'handlers/refreshLiveStreamRecordings.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}/refresh',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
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
    getLiveStream: {
      handler: 'handlers/getLiveStream.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}',
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
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    getLiveStreamRecordingViewingParameters: {
      handler: 'handlers/getLiveStreamRecordingViewingParameters.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}/view',
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
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    getLiveStreamRecordingMessages: {
      handler: 'handlers/getLiveStreamRecordingMessages.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}/messages',
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
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    createChatToken: {
      handler: 'handlers/createChatToken.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}/chatSession',
            method: 'post',
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
