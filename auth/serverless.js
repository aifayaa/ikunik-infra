/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'auth',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: {
      ...env,
      FACEBOOK_CLIENT_ID:
        '${self:custom.${self:provider.stage}.${self:provider.region}.FACEBOOK_CLIENT_ID}',
      FACEBOOK_CLIENT_SECRET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.FACEBOOK_CLIENT_SECRET}',
      TWITTER_CONSUMER_KEY:
        '${self:custom.${self:provider.stage}.${self:provider.region}.TWITTER_CONSUMER_KEY}',
      TWITTER_CONSUMER_SECRET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.TWITTER_CONSUMER_SECRET}',
      INSTAGRAM_CLIENT_ID:
        '${self:custom.${self:provider.stage}.${self:provider.region}.INSTAGRAM_CLIENT_ID}',
      INSTAGRAM_CLIENT_SECRET:
        '${self:custom.${self:provider.stage}.${self:provider.region}.INSTAGRAM_CLIENT_SECRET}',
      REACT_APP_AUTH_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_AUTH_URL}',
      REACT_APP_API_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_API_URL}',
      S3_APPS_RESSOURCES:
        '${self:custom.${self:provider.stage}.${self:provider.region}.S3_APPS_RESSOURCES}',
      CROWDAA_REGION:
        '${self:custom.${self:provider.stage}.${self:provider.region}.CROWDAA_REGION}',
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['lambda:InvokeFunction'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: [
              'ec2:DescribeNetworkInterfaces',
              'ec2:CreateNetworkInterface',
              'ec2:DeleteNetworkInterface',
              'ec2:DescribeInstances',
              'ec2:AttachNetworkInterface',
            ],
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
        '/admin': '${cf:admin-${self:provider.stage}.RestApiRootResourceId}',
      },
    },
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    appleLogin: {
      handler: 'handlers/appleLogin.default',
      events: [
        {
          http: {
            path: 'auth/apple',
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
    facebookLogin: {
      handler: 'handlers/facebookLogin.default',
      events: [
        {
          http: {
            path: 'auth/facebook',
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
    forgotPassword: {
      handler: 'handlers/forgotPassword.default',
      events: [
        {
          http: {
            path: 'auth/forgotPassword',
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
    login: {
      handler: 'handlers/login.default',
      events: [
        {
          http: {
            path: 'auth/login',
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
    logout: {
      handler: 'handlers/logout.default',
      events: [
        {
          http: {
            path: 'auth/facebook/logout',
            method: 'post',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent',
                'X-User-Id',
              ],
            },
          },
        },
        {
          http: {
            path: 'auth/logout',
            method: 'post',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent',
                'X-User-Id',
                'X-Auth-Token',
              ],
            },
          },
        },
      ],
    },
    oidcLogin: {
      handler: 'handlers/oidcLogin.default',
      events: [
        {
          http: {
            path: 'auth/oidc',
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
    periodicSIWATokensCheck: {
      handler: 'handlers/periodicSIWATokensCheck.default',
    },
    register: {
      handler: 'handlers/register.default',
      events: [
        {
          http: {
            path: 'auth/register',
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
    adminRegister: {
      handler: 'handlers/adminRegister.default',
      events: [
        {
          http: {
            path: 'admin/auth/register',
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
      vpc: '${self:custom.vpcConfig.${self:provider.region}}',
    },
    resetPassword: {
      handler: 'handlers/resetPassword.default',
      events: [
        {
          http: {
            path: 'auth/resetPassword',
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
    changePassword: {
      handler: 'handlers/changePassword.default',
      events: [
        {
          http: {
            path: 'auth/changePassword',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}',
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
    validateEmail: {
      handler: 'handlers/validateEmail.default',
      events: [
        {
          http: {
            path: 'auth/validateEmail',
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
    sessionChecks: {
      handler: 'handlers/sessionChecks.default',
      events: [
        {
          http: {
            path: 'auth/sessionChecks',
            method: 'get',
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
    samlLogin: {
      handler: 'handlers/samlLogin.default',
      events: [
        {
          http: {
            path: 'auth/saml/login/{key}',
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
    samlACSCallback: {
      handler: 'handlers/samlACSCallback.default',
      events: [
        {
          http: {
            path: 'auth/saml/acscallback',
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
    oauthCallback: {
      handler: 'handlers/oauthCallback.default',
      events: [
        {
          http: {
            path: 'auth/oauth/{id}/callback',
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
    openSessionAs: {
      handler: 'handlers/openSessionAs.default',
      events: [
        {
          http: {
            path: 'auth/openSessionAs',
            method: 'post',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerAdminId}',
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
  custom: {
    logRetentionInDays: 30,
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
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
        FACEBOOK_CLIENT_ID: 352221332080221,
        FACEBOOK_CLIENT_SECRET: '5fc5f7a249699050432f6d62af245053',
        TWITTER_CONSUMER_KEY: 'AyHV26LVuRYreMec85nKzypL5',
        TWITTER_CONSUMER_SECRET:
          'LmGNgDl4SzlmspQjjNv2qtmbMLPpxSoPQLRT5GLWIeyCgN5iVr',
        INSTAGRAM_CLIENT_ID: '60bf5b13399a42d7a1f63fc31a8bfdba',
        INSTAGRAM_CLIENT_SECRET: 'ad01b10b27954a7d9ee3630ad82bf31b',
        REACT_APP_AUTH_URL: 'https://dev-auth.crowdaa.com',
        REACT_APP_API_URL: 'https://dev-api.aws.crowdaa.com/v1',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-dev',
        S3_APPS_RESSOURCES_REGION: 'us-east-1',
        CROWDAA_REGION: 'us',
      },
    },
    preprod: {
      'eu-west-3': {
        FACEBOOK_CLIENT_ID: 1669225803297816,
        FACEBOOK_CLIENT_SECRET: 'e41cf19bbaa651182a2f618a512024d1',
        TWITTER_CONSUMER_KEY: 'AyHV26LVuRYreMec85nKzypL5',
        TWITTER_CONSUMER_SECRET:
          'LmGNgDl4SzlmspQjjNv2qtmbMLPpxSoPQLRT5GLWIeyCgN5iVr',
        INSTAGRAM_CLIENT_ID: '60bf5b13399a42d7a1f63fc31a8bfdba',
        INSTAGRAM_CLIENT_SECRET: 'ad01b10b27954a7d9ee3630ad82bf31b',
        REACT_APP_AUTH_URL: 'https://preprod-auth.crowdaa.com',
        REACT_APP_API_URL: 'https://preprod-api.aws.crowdaa.com/v1',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-preprod',
        S3_APPS_RESSOURCES_REGION: 'eu-west-3',
        CROWDAA_REGION: 'fr',
      },
    },
    prod: {
      'eu-west-3': {
        FACEBOOK_CLIENT_ID: 1669225803297816,
        FACEBOOK_CLIENT_SECRET: 'e41cf19bbaa651182a2f618a512024d1',

        TWITTER_CONSUMER_KEY: 'AyHV26LVuRYreMec85nKzypL5',
        TWITTER_CONSUMER_SECRET:
          'LmGNgDl4SzlmspQjjNv2qtmbMLPpxSoPQLRT5GLWIeyCgN5iVr',
        INSTAGRAM_CLIENT_ID: '60bf5b13399a42d7a1f63fc31a8bfdba',
        INSTAGRAM_CLIENT_SECRET: 'ad01b10b27954a7d9ee3630ad82bf31b',
        REACT_APP_AUTH_URL: 'https://auth-fr.crowdaa.com',
        REACT_APP_API_URL: 'https://api-fr.aws.crowdaa.com/v1',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources-prod-fr',
        S3_APPS_RESSOURCES_REGION: 'eu-west-3',
        CROWDAA_REGION: 'fr',
      },
      'us-east-1': {
        FACEBOOK_CLIENT_ID: 1669225803297816,
        FACEBOOK_CLIENT_SECRET: 'e41cf19bbaa651182a2f618a512024d1',
        TWITTER_CONSUMER_KEY: 'AyHV26LVuRYreMec85nKzypL5',
        TWITTER_CONSUMER_SECRET:
          'LmGNgDl4SzlmspQjjNv2qtmbMLPpxSoPQLRT5GLWIeyCgN5iVr',
        INSTAGRAM_CLIENT_ID: '60bf5b13399a42d7a1f63fc31a8bfdba',
        INSTAGRAM_CLIENT_SECRET: 'ad01b10b27954a7d9ee3630ad82bf31b',
        REACT_APP_AUTH_URL: 'https://auth.crowdaa.com',
        REACT_APP_API_URL: 'https://api.aws.crowdaa.com/v1',
        S3_APPS_RESSOURCES: 'crowdaa-apps-resources',
        S3_APPS_RESSOURCES_REGION: 'us-east-1',
        CROWDAA_REGION: 'us',
      },
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
  },
  package: {
    individually: true,
  },
};

module.exports = serverlessConfiguration;
