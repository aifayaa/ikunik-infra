/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'apps',
  custom: {
    logRetentionInDays: 7,
    prune: { automatic: true, number: 3 },
    'serverless-disable-request-validators': { action: 'delete' },
    dev: {
      'us-east-1': {
        INVITE_MAIL_LANG: 'en',
        REACT_APP_AUTH_URL: 'https://dev-auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://dev-blog.crowdaa.com',
        CROWDAA_REGION: 'us',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-dev',
      },
    },
    preprod: {
      'eu-west-3': {
        INVITE_MAIL_LANG: 'fr',
        REACT_APP_AUTH_URL: 'https://depreprodv-auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://preprod-blog.crowdaa.com',
        CROWDAA_REGION: 'fr',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-preprod',
      },
    },
    prod: {
      'us-east-1': {
        INVITE_MAIL_LANG: 'en',
        REACT_APP_AUTH_URL: 'https://auth.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog.crowdaa.com',
        CROWDAA_REGION: 'us',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources',
      },
      'eu-west-3': {
        INVITE_MAIL_LANG: 'fr',
        REACT_APP_AUTH_URL: 'https://auth-fr.crowdaa.com',
        REACT_APP_PRESS_SERVICE_URL: 'https://blog-fr.crowdaa.com',
        CROWDAA_REGION: 'fr',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-prod-fr',
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
      INVITE_MAIL_LANG:
        '${self:custom.${self:provider.stage}.${self:provider.region}.INVITE_MAIL_LANG}',
      REACT_APP_AUTH_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_AUTH_URL}',
      REACT_APP_PRESS_SERVICE_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_PRESS_SERVICE_URL}',
      CROWDAA_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.CROWDAA_REGION}',
      PLAYLISTS_WORDPRESS_URL: 'https://test-playlist.crowdaa.com/wp-json',
      S3_APPS_RESSOURCES:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_APPS_RESSOURCES}',
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
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.S3_APPS_RESSOURCES}/*',
            ],
          },
          {
            Effect: 'Allow',
            Action: ['s3:ListBucket'],
            Resource: [
              'arn:aws:s3:::${self:provider.environment.S3_APPS_RESSOURCES}',
            ],
          },
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: '*',
          },
        ],
      },
    },
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
                headers: { Authorization: true },
              },
            },
          },
        },
        {
          http: {
            path: 'apps',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: { Authorization: true },
              },
            },
          },
        },
      ],
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
            request: {
              parameters: {
                headers: { Authorization: true },
              },
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
            request: {
              parameters: {
                headers: { Authorization: true },
              },
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
    getAppTos: {
      handler: 'handlers/getAppTos.default',
      events: [
        {
          http: {
            path: 'apps/{id}/tos',
            method: 'get',
            cors: true,
            request: { parameters: { paths: { id: true } } },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
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
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
          },
        },
      ],
    },
    getApp: {
      handler: 'handlers/getApp.default',
      events: [
        {
          http: {
            path: 'apps/{id}',
            method: 'get',
            cors: true,
            request: {
              parameters: { paths: { id: true } },
            },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
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
            request: {
              parameters: { paths: { id: true } },
            },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
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
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
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
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
          },
        },
      ],
    },
    getAppUser: {
      handler: 'handlers/getAppUser.default',
      events: [
        {
          http: {
            path: 'apps/{id}/users/{userId}',
            method: 'get',
            cors: true,
            request: { parameters: { paths: { id: true, userId: true } } },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
          },
        },
      ],
    },
    putAppUserPerms: {
      handler: 'handlers/putAppUserPerms.default',
      events: [
        {
          http: {
            path: 'apps/{id}/users',
            method: 'put',
            cors: true,
            request: {
              parameters: { paths: { id: true, userId: true } },
            },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
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
            request: {
              parameters: { paths: { id: true, userId: true } },
            },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
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
            request: { parameters: { paths: { id: true, userId: true } } },
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
          },
        },
      ],
    },
    activateWPPlaylists: {
      handler: 'handlers/postAppsIdActivateWPPlaylists.default',
      events: [
        {
          http: {
            path: 'apps/{id}/activateWPPlaylists',
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
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    getWPPlaylists: {
      handler: 'handlers/getAppsIdWPPlaylists.default',
      events: [
        {
          http: {
            path: 'apps/{id}/wpPlaylists',
            method: 'GET',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    downloadBundle: {
      handler: 'handlers/downloadBundle.default',
      events: [
        {
          http: {
            path: 'apps/{id}/downloadBundle',
            method: 'GET',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    downloadScreenshots: {
      handler: 'handlers/downloadScreenshots.default',
      events: [
        {
          http: {
            path: 'apps/{id}/downloadScreenshots',
            method: 'GET',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                paths: { id: true },
                headers: {
                  Authorization: true,
                },
              },
            },
          },
        },
      ],
    },
    // 2024/08/08: Integration of Pascal's work
    // stripeEnableSubscription: {
    //   handler: 'handlers/putAppsIdEnableSubscription.default',
    //   events: [
    //     {
    //       http: {
    //         path: 'apps/{id}/enableSubscription',
    //         method: 'PUT',
    //         cors: true,
    //         authorizer: {
    //           type: 'CUSTOM',
    //           authorizerId:
    //             '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
    //         },
    //         request: {
    //           parameters: {
    //             paths: { id: true },
    //             headers: {
    //               Authorization: true,
    //             },
    //           },
    //         },
    //       },
    //     },
    //   ],
    // },
    // 2024/08/08: Integration of Pascal's work
    // triggerComputeActiveUsers: {
    //   handler: 'handlers/triggerComputeActiveUsers.default',
    //   timeout: 600,
    //   events: [
    //     {
    //       http: {
    //         path: 'apps/triggerComputeActiveUsers',
    //         method: 'PUT',
    //         cors: true,
    //         authorizer: {
    //           type: 'CUSTOM',
    //           authorizerId:
    //             '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
    //         },
    //         request: {
    //           parameters: {
    //             headers: {
    //               Authorization: true,
    //             },
    //           },
    //         },
    //       },
    //     },
    //     {
    //       eventBridge: {
    //         schedule: 'cron(0 0 * * ? *)', // Every day at midnight
    //       },
    //     },
    //   ],
    // },
    // 2024/08/08: Integration of Pascal's work
    // putComputeActiveUsersForDay: {
    //   handler: 'handlers/putComputeActiveUsersForDay.default',
    //   timeout: 300,
    //   events: [
    //     {
    //       http: {
    //         path: 'apps/{id}/computeActiveUsersForDay',
    //         method: 'PUT',
    //         cors: true,
    //         authorizer: {
    //           type: 'CUSTOM',
    //           authorizerId:
    //             '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
    //         },
    //         request: {
    //           parameters: {
    //             paths: { id: true },
    //             headers: {
    //               Authorization: true,
    //             },
    //           },
    //         },
    //       },
    //     },
    //   ],
    // },
  },
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-plugin-log-retention',
    'serverless-export-env',
  ],
  resources: {
    Outputs: {
      RestApiRootResourceId: {
        Description: 'Api Gateway apps ID',
        Value: {
          Ref: 'ApiGatewayResourceApps',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceId',
        },
      },
      RestApiAppsIdResourceId: {
        Description: 'Api Gateway app ID',
        Value: {
          Ref: 'ApiGatewayResourceAppsIdVar',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiAppsIdResourceId',
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
