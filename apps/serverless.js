/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'apps',
  custom: {
    prune: { automatic: true, number: 3 },
    'serverless-disable-request-validators': { action: 'delete' },
    vpcConfig: {
      'us-east-1': {
        securityGroupIds: ['sg-022c00c994d25c46e'],
        subnetIds: ['subnet-0eef72fa8d060da6e'],
      },
      'eu-west-3': {
        securityGroupIds: ['sg-05867825a09444a43'],
        subnetIds: ['subnet-0977176abc4c94459'],
      },
    },
    dev: {
      'us-east-1': {
        INVITE_MAIL_LANG: 'en',
        REACT_APP_AUTH_URL: 'https://dev-auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://dev-blog.crowdaa.com',
      },
    },
    preprod: {
      'eu-west-3': {
        INVITE_MAIL_LANG: 'fr',
        REACT_APP_AUTH_URL: 'https://depreprodv-auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://preprod-blog.crowdaa.com',
      },
    },
    prod: {
      'us-east-1': {
        INVITE_MAIL_LANG: 'en',
        REACT_APP_AUTH_URL: 'https://auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog.crowdaa.com',
      },
      'eu-west-3': {
        INVITE_MAIL_LANG: 'fr',
        REACT_APP_AUTH_URL: 'https://auth-fr.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog-fr.crowdaa.com',
      },
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
      INVITE_MAIL_LANG:
        '${self:custom.${self:provider.stage}.${self:provider.region}.INVITE_MAIL_LANG}',
      REACT_APP_AUTH_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_AUTH_URL}',
      REACT_APP_PRESS_SERVICE_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_PRESS_SERVICE_URL}',
    },
    apiGateway: {
      restApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
      restApiRootResourceId:
        '${cf:api-v1-${self:provider.stage}.RestApiRootResourceId}',
      restApiResources: {
        '/admin': '${cf:admin-${self:provider.stage}.RestApiRootResourceId}',
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    createApp: {
      handler: 'handlers/createApp.default',
      events: [
        {
          http: {
            path: 'admin/apps',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
    },
    getAppPerms: {
      handler: 'handlers/getAppPerms.default',
      events: [
        {
          http: {
            path: 'apps/perms',
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
    getAppSettings: {
      handler: 'handlers/getAppSettings.default',
      events: [
        {
          http: {
            path: 'apps/settings',
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
    getAppAllSettings: {
      handler: 'handlers/getAppAllSettings.default',
      events: [
        {
          http: {
            path: 'apps/{id}/settings',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    getAppAdminStats: {
      handler: 'handlers/getAppAdminStats.default',
      events: [
        {
          http: {
            path: 'admin/apps/{id}/stats',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    updateAppAllSettings: {
      handler: 'handlers/updateAppAllSettings.default',
      events: [
        {
          http: {
            path: 'apps/{id}/settings',
            method: 'patch',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    inviteAppAdmin: {
      handler: 'handlers/inviteAppAdmin.default',
      events: [
        {
          http: {
            path: 'apps/{id}/admins',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    getAppAdmins: {
      handler: 'handlers/getAppAdmins.default',
      events: [
        {
          http: {
            path: 'apps/{id}/admins',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    deleteAppAdmin: {
      handler: 'handlers/deleteAppAdmin.default',
      events: [
        {
          http: {
            path: 'apps/{id}/admins',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    getAppStatus: {
      handler: 'handlers/getAppStatus.default',
      events: [
        {
          http: {
            path: 'apps/{id}/status',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    getAppInfos: {
      handler: 'handlers/getAppInfos.default',
      events: [
        {
          http: {
            path: 'apps/{id}/infos',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
    },
    getAppBuilds: {
      handler: 'handlers/getAppBuilds.default',
      events: [
        {
          http: {
            path: 'apps/{id}/builds',
            method: 'get',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    getAppPreview: {
      handler: 'handlers/getAppPreview.default',
      events: [
        {
          http: {
            path: 'apps/preview/{id}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    sendPreviewInfo: {
      handler: 'handlers/sendPreviewInfo.default',
      events: [
        {
          http: {
            path: 'apps/preview',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: { headers: { Authorization: true } },
            },
          },
        },
      ],
    },
    setAppSetup: {
      handler: 'handlers/setAppSetup.default',
      events: [
        {
          http: {
            path: 'apps/{id}/setup',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: { headers: { Authorization: true } },
            },
          },
        },
      ],
    },
    getAppSetup: {
      handler: 'handlers/getAppSetup.default',
      events: [
        {
          http: {
            path: 'apps/{id}/setup',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerWithPermsId}',
            },
            request: {
              parameters: { headers: { Authorization: true } },
            },
          },
        },
      ],
    },
    getAppTos: {
      handler: 'handlers/getAppTos.default',
      events: [
        {
          http: {
            path: 'apps/{id}/tos',
            method: 'get',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    getUserApps: {
      handler: 'handlers/getUserApps.default',
      events: [
        {
          http: {
            path: 'apps',
            method: 'get',
            cors: true,
            request: {
              parameters: { headers: { Authorization: true } },
            },
          },
        },
      ],
    },
    createNoStoreApp: {
      handler: 'handlers/createNoStoreApp.default',
      events: [
        {
          http: {
            path: 'apps',
            method: 'put',
            cors: true,
            request: {
              parameters: { headers: { Authorization: true } },
            },
          },
        },
      ],
    },
    modifyApp: {
      handler: 'handlers/modifyApp.default',
      events: [
        {
          http: {
            path: 'apps/{id}',
            method: 'patch',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    delApp: {
      handler: 'handlers/delApp.default',
      events: [
        {
          http: {
            path: 'apps/{id}',
            method: 'delete',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    getAppUsers: {
      handler: 'handlers/getAppUsers.default',
      events: [
        {
          http: {
            path: 'apps/{id}/users',
            method: 'get',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    modifyAppUserPerms: {
      handler: 'handlers/modifyAppUserPerms.default',
      events: [
        {
          http: {
            path: 'apps/{id}/users/{userId}',
            method: 'patch',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    delUserAppPerms: {
      handler: 'handlers/delUserAppPerms.default',
      events: [
        {
          http: {
            path: 'apps/{id}/users/{userId}',
            method: 'delete',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    startBuild: {
      handler: 'handlers/startBuild.default',
      events: [
        {
          http: {
            path: 'apps/{id}/build',
            method: 'put',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
    getBuildStatus: {
      handler: 'handlers/getBuildStatus.default',
      events: [
        {
          http: {
            path: 'apps/{id}/build',
            method: 'get',
            cors: true,
            request: { parameters: { paths: { id: true } } },
          },
        },
      ],
    },
  },
  plugins: [
    'serverless-webpack',
    '@cruglobal/serverless-merge-config',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-export-env',
  ],
};

module.exports = serverlessConfiguration;
