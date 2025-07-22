/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'users',
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
        REACT_APP_CROWD_SERVICE_URL: 'https://dev-crowd.crowdaa.com',
      },
    },
    preprod: {
      'eu-west-3': {
        REACT_APP_CROWD_SERVICE_URL: 'https://preprod-crowd.crowdaa.com',
      },
    },
    prod: {
      'us-east-1': {
        REACT_APP_CROWD_SERVICE_URL: 'https://crowd.crowdaa.com',
      },
      'eu-west-3': {
        REACT_APP_CROWD_SERVICE_URL: 'https://crowd-fr.crowdaa.com',
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
    region: '${opt:region, "us-east-1"}',
    memorySize: 128,
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
    environment: {
      ...env,
      REACT_APP_CROWD_SERVICE_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_CROWD_SERVICE_URL}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
    },
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    searchUser: {
      handler: 'handlers/searchUser.default',
      events: [
        {
          http: {
            path: 'users/search',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
          },
        },
      ],
    },
    exportUsers: {
      handler: 'handlers/exportUsers.default',
      events: [
        {
          http: {
            path: 'users/export',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
          },
        },
      ],
    },
    addAppId: {
      handler: 'handlers/addAppId.default',
      events: [
        {
          http: {
            path: 'users/addAppId',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
          },
        },
      ],
    },
    blastEmail: {
      handler: 'handlers/blastEmail.default',
      events: [
        {
          http: {
            path: 'users/{id}/blast/email',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerArtistId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    blastNotification: {
      handler: 'handlers/blastNotification.default',
      events: [
        {
          http: {
            path: 'users/{id}/blast/notification',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerArtistId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    blastText: {
      handler: 'handlers/blastText.default',
      events: [
        {
          http: {
            path: 'users/{id}/blast/text',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerArtistId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getPublicProfile: {
      handler: 'handlers/getPublicProfile.default',
      events: [
        {
          http: {
            path: 'users/{id}/profile',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getApps: {
      handler: 'handlers/getApps.default',
      events: [
        {
          http: {
            path: 'users/{id}/apps',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerNoAppId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getAppsPreviews: {
      handler: 'handlers/getAppsPreviews.default',
      events: [
        {
          http: {
            path: 'users/{id}/apps/previews',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getBalances: {
      handler: 'handlers/getBalances.default',
      events: [
        {
          http: {
            path: 'users/{id}/balances',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerArtistId}',
            },
            cors: true,
            request: {
              parameters: {
                paths: {
                  id: true,
                },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getUser: {
      handler: 'handlers/getUser.default',
    },
    getUserPublic: {
      handler: 'handlers/getUserPublic.default',
      events: [
        {
          http: {
            path: 'users/{id}',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
    finalizeProfile: {
      handler: 'handlers/finalizeProfile.default',
      events: [
        {
          http: {
            path: 'users/{id}/finalizeProfile',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
    getHistory: {
      handler: 'handlers/getHistory.default',
      events: [
        {
          http: {
            path: 'users/{id}/history/',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    addHistory: {
      handler: 'handlers/addHistory.default',
      events: [
        {
          http: {
            path: 'users/{id}/history/',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    optIn: {
      handler: 'handlers/optIn.default',
      events: [
        {
          http: {
            path: 'users/{id}/optin',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    delete: {
      handler: 'handlers/deleteUser.default',
      events: [
        {
          http: {
            path: 'users/{id}',
            method: 'delete',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            cors: true,
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
    isBlastable: {
      handler: 'handlers/isBlastable.default',
      events: [
        {
          http: {
            path: 'users/{id}/isBlastable',
            method: 'get',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    sendPinCode: {
      handler: 'handlers/sendPinCode.default',
      events: [
        {
          http: {
            path: 'users/{id}/phone',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    checkPinCode: {
      handler: 'handlers/checkPinCode.default',
      events: [
        {
          http: {
            path: 'users/{id}/phone/validation',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    generateApiToken: {
      handler: 'handlers/generateApiToken.default',
      events: [
        {
          http: {
            path: 'users/{id}/apiToken',
            method: 'post',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerRoleId}',
            },
            cors: true,
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
    editUserSettings: {
      handler: 'handlers/editUserSettings.default',
      events: [
        {
          http: {
            path: 'users/{id}/settings',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
    editProfile: {
      handler: 'handlers/editProfile.default',
      events: [
        {
          http: {
            path: 'users/{id}',
            method: 'put',
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
            },
            cors: true,
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
  package: {
    individually: true,
  },
  resources: {
    Outputs: {
      RestApiRootResourceId: {
        Description: 'Api Gateway users ID',
        Value: {
          Ref: 'ApiGatewayResourceUsersIdVar',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceId',
        },
      },
    },
  },
};
module.exports = serverlessConfiguration;
