/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'pressPolls',
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
  },
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: '${file(../env.js)}',
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
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
      restApiResources: {
        '/press': '${cf:press-${self:provider.stage}.RestApiRootResourceId}',
        '/admin/press':
          '${cf:press-${self:provider.stage}.RestApiRootResourceAdminPressId}',
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: '${env:MS_DEPLOYMENT_BUCKET, "ms-deployment-${self:provider.region}"}',
  },
  functions: {
    createPoll: {
      handler: 'handlers/createPoll.default',
      events: [
        {
          http: {
            path: 'admin/press/polls/',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
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
    updatePoll: {
      handler: 'handlers/updatePoll.default',
      events: [
        {
          http: {
            path: 'admin/press/polls/{id}',
            method: 'patch',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
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
    deletePoll: {
      handler: 'handlers/deletePoll.default',
      events: [
        {
          http: {
            path: 'admin/press/polls/{id}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
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
    getPolls: {
      handler: 'handlers/getPolls.default',
      events: [
        {
          http: {
            path: 'admin/press/polls/',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
        {
          http: {
            path: 'press/polls/',
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
    getPoll: {
      handler: 'handlers/getPoll.default',
      events: [
        {
          http: {
            path: 'admin/press/polls/{id}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
        {
          http: {
            path: 'press/polls/{id}',
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
    getPollResults: {
      handler: 'handlers/getPollResults.default',
      events: [
        {
          http: {
            path: 'admin/press/polls/{id}/results',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
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
    exportPollResults: {
      handler: 'handlers/exportPollResults.default',
      events: [
        {
          http: {
            path: 'admin/press/polls/{id}/export',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
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
    vote: {
      handler: 'handlers/vote.default',
      events: [
        {
          http: {
            path: 'press/polls/{id}/vote',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
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
  package: {
    individually: true,
  },
  resources: {
    Outputs: {
      RestApiRootResourcePressPollsId: {
        Description: 'Api Gateway pressPolls ID',
        Value: {
          Ref: 'ApiGatewayResourcePressPolls',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourcePressPollsId',
        },
      },
      RestApiRootResourceAdminPressPollsId: {
        Description: 'Api Gateway pressPolls ID',
        Value: {
          Ref: 'ApiGatewayResourceAdminPressPolls',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceAdminPressPollsId',
        },
      },
    },
  },
};
module.exports = serverlessConfiguration;
