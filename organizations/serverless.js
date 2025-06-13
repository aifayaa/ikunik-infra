/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'organizations',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: {
      ...env,
      CROWDAA_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.CROWDAA_REGION}',
      STRIPE_SECRET_KEY:
        '${ssm(us-east-1):/crowdaa_microservices/${self:custom.stripeStage.${self:provider.stage}}/payment/stripe-secret-key}',
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
            Action: ['lambda:InvokeFunction'],
            Resource:
              'arn:aws:lambda:${self:provider.region}:630176884077:function:asyncLambdas-${self:provider.stage}-networkRequest',
          },
        ],
      },
    },
  },
  functions: {
    getUserOrgs: {
      handler: 'handlers/getUserOrgs.default',
      events: [
        {
          http: {
            path: 'organizations',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
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
    createOrg: {
      handler: 'handlers/createOrg.default',
      events: [
        {
          http: {
            path: 'organizations',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
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
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
    },
    deleteOrg: {
      handler: 'handlers/deleteOrg.default',
      events: [
        {
          http: {
            path: 'organizations/{id}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    updateOrg: {
      handler: 'handlers/updateOrg.default',
      events: [
        {
          http: {
            path: 'organizations/{id}',
            method: 'patch',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    getOrg: {
      handler: 'handlers/getOrg.default',
      events: [
        {
          http: {
            path: 'organizations/{id}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    getOrgApps: {
      handler: 'handlers/getOrgApps.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/apps',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    putAppInOrg: {
      handler: 'handlers/putAppInOrg.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/apps',
            method: 'put',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
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
    // getOrgWebsites: {
    //   handler: 'handlers/getOrgWebsites.default',
    //   events: [
    //     {
    //       http: {
    //         path: 'organizations/{id}/websites',
    //         method: 'get',
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
    //             paths: {
    //               id: true,
    //             },
    //           },
    //         },
    //       },
    //     },
    //   ],
    // },
    getOrgUsers: {
      handler: 'handlers/getOrgUsers.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/users',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    getOrganizationIdUsersUserId: {
      handler: 'handlers/getOrganizationIdUsersUserId.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/users/{userId}',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    changeUserOrgPerms: {
      handler: 'handlers/changeUserOrgPerms.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/users/{userId}',
            method: 'patch',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                  userId: true,
                },
              },
            },
          },
        },
      ],
    },
    delUserOrgPerms: {
      handler: 'handlers/delUserOrgPerms.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/users/{userId}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                  userId: true,
                },
              },
            },
          },
        },
      ],
    },
    delOrgApp: {
      handler: 'handlers/delOrgApp.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/apps/{appId}',
            method: 'delete',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
                paths: {
                  id: true,
                  userId: true,
                },
              },
            },
          },
        },
      ],
    },
    getOrgInvitations: {
      handler: 'handlers/getOrgInvitations.default',
      events: [
        {
          http: {
            path: 'organizations/{id}/invitations',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
            },
            request: {
              parameters: {
                headers: {
                  Authorization: true,
                },
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
  custom: {
    /* This is the internal network (used to call internal APIs like baserow) */
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
        CROWDAA_REGION: 'us',
      },
    },
    preprod: {
      'eu-west-3': {
        CROWDAA_REGION: 'fr',
      },
    },
    prod: {
      'us-east-1': {
        CROWDAA_REGION: 'us',
      },
      'eu-west-3': {
        CROWDAA_REGION: 'fr',
      },
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
    stripeStage: {
      dev: 'dev',
      preprod: 'dev',
      prod: 'prod',
    },
  },
  package: {
    individually: true,
  },
};

module.exports = serverlessConfiguration;
