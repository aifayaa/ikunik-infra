/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'appLiveStreams',
  custom: {
    logRetentionInDays: 30,
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
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'DevCountAppLiveStreamViewers',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-dev-us-countAppLiveStreamViewers-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:appLiveStream-dev-countAppLiveStreamViewers',
      },
    },
    preprod: {
      'eu-west-3': {
        IVS_REGION: 'eu-west-1',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME:
          'PreprodCountAppLiveStreamViewers',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-preprod-fr-countAppLiveStreamViewers-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:appLiveStream-preprod-countAppLiveStreamViewers',
      },
    },
    prod: {
      'us-east-1': {
        IVS_REGION: 'us-east-1',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'ProdCountAppLiveStreamViewers',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-us-countAppLiveStreamViewers-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:us-east-1:630176884077:function:appLiveStream-prod-countAppLiveStreamViewers',
      },
      'eu-west-3': {
        IVS_REGION: 'eu-west-1',
        LIVE_STREAM_WATCHER_STATE_MACHINE_NAME: 'ProdCountAppLiveStreamViewers',
        LIVE_STREAM_WATCHER_STATE_MACHINE_ROLE:
          'arn:aws:iam::630176884077:role/service-role/StepFunctions-prod-fr-countAppLiveStreamViewers-role',
        LIVE_STREAM_WATCHER_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:eu-west-3:630176884077:function:appLiveStream-prod-countAppLiveStreamViewers',
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
          {
            Effect: 'Allow',
            Action: ['ivs:*'],
            Resource:
              'arn:aws:ivs:${self:provider.environment.IVS_REGION}:630176884077:*',
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
    countAppLiveStreamViewers: {
      handler: 'handlers/countAppLiveStreamViewers.default',
      timeout: 300,
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
    getLiveStream: {
      handler: 'handlers/getLiveStream.default',
      events: [
        {
          http: {
            path: 'appLiveStreams/{id}',
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
