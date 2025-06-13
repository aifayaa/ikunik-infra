/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'crowd',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 1024,
    timeout: 30,
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
    environment: '${file(../env.js)}',
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
      restApiResources: {
        '/admin/press':
          '${cf:press-${self:provider.stage}.RestApiRootResourceAdminPressId}',
        '/admin': '${cf:admin-${self:provider.stage}.RestApiRootResourceId}',
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    blastSearchEmail: {
      handler: 'handlers/blastSearchEmail.default',
      events: [
        {
          http: {
            path: 'crowd/blast/email',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                querystrings: '${self:custom.querystrings}',
              },
            },
          },
        },
      ],
    },
    blastSearchNotification: {
      handler: 'handlers/blastSearchNotif.default',
      events: [
        {
          http: {
            path: 'crowd/blast/notification',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                querystrings: '${self:custom.querystrings}',
              },
            },
          },
        },
      ],
    },
    blastSearchText: {
      handler: 'handlers/blastSearchText.default',
      events: [
        {
          http: {
            path: 'crowd/blast/text',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                querystrings: '${self:custom.querystrings}',
              },
            },
          },
        },
      ],
    },
    pressBlastSearchNotification: {
      handler: 'handlers/pressBlastSearchNotif.default',
      events: [
        {
          http: {
            path: 'admin/press/crowd/blast/notifications',
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
                querystrings: '${self:custom.querystrings}',
              },
            },
          },
        },
      ],
    },
    pressSearch: {
      handler: 'handlers/pressSearch.default',
      events: [
        {
          http: {
            path: 'admin/press/crowd',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: {
              origin: '*',
              headers: [
                'Cache-Control',
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent',
              ],
              allowCredentials: false,
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                querystrings: '${self:custom.querystrings}',
              },
            },
          },
        },
      ],
    },
    crowdSearch: {
      handler: 'handlers/crowdSearch.default',
      events: [
        {
          http: {
            path: 'admin/crowd/search',
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
    crowdSearchGeoJSON: {
      handler: 'handlers/crowdSearchGeoJSON.default',
      events: [
        {
          http: {
            path: 'admin/crowd/search.geojson',
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
    crowdLastGeoJSON: {
      handler: 'handlers/crowdLastGeoJSON.default',
      events: [
        {
          http: {
            path: 'admin/crowd/last.geojson',
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
    crowdMassUpdateBadgesApply: {
      handler: 'handlers/crowdMassUpdateBadgesApply.default',
      timeout: 600,
    },
    crowdMassUpdate: {
      handler: 'handlers/crowdMassUpdate.default',
      events: [
        {
          http: {
            path: 'admin/crowd/{action}',
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
  },
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-plugin-log-retention',
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
    querystrings: {
      articleId: false,
      artist: false,
      city: false,
      coordinates: false,
      country: false,
      gender: false,
      hasEmail: false,
      hasNotification: false,
      hasText: false,
      languages: false,
      limit: false,
      maximumAge: false,
      minFBFriends: false,
      minimumAge: false,
      page: false,
      project: false,
      purchased: false,
      search: false,
      sortBy: false,
      sortOrder: false,
      track: false,
      type: false,
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
  },
};
module.exports = serverlessConfiguration;
