/* eslint-disable no-template-curly-in-string */
const env = require('../env');

const serverlessConfiguration = {
  service: 'pressArticles',
  custom: {
    awsAccountId: '${aws:accountId}',
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
        REACT_APP_SSR_URL: 'dev-ssr.aws.crowdaa.com',
        NOTIFICATION_STATE_MACHINE_NAME: 'DevSendArticleNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::${self:custom.awsAccountId}:role/service-role/StepFunctions-DevUsSendArticleNotifications-role',
        NOTIFICATION_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:pressArticles-dev-sendArticleNotifications',
      },
    },
    preprod: {
      'eu-west-3': {
        REACT_APP_SSR_URL: 'preprod-ssr.aws.crowdaa.com',
        NOTIFICATION_STATE_MACHINE_NAME: 'PreprodSendArticleNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::${self:custom.awsAccountId}:role/service-role/StepFunctions-PreprodFrSendArticleNotifications-role',
        NOTIFICATION_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:pressArticles-preprod-sendArticleNotifications',
      },
    },
    prod: {
      'us-east-1': {
        REACT_APP_SSR_URL: 'ssr.aws.crowdaa.com',
        NOTIFICATION_STATE_MACHINE_NAME: 'ProdSendArticleNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::${self:custom.awsAccountId}:role/service-role/StepFunctions-ProdUsSendArticleNotifications-role',
        NOTIFICATION_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:pressArticles-prod-sendArticleNotifications',
      },
      'eu-west-3': {
        REACT_APP_SSR_URL: 'ssr-fr.aws.crowdaa.com',
        NOTIFICATION_STATE_MACHINE_NAME: 'ProdSendArticleNotifications',
        NOTIFICATION_STATE_MACHINE_ROLE:
          'arn:aws:iam::${self:custom.awsAccountId}:role/service-role/StepFunctions-ProdFrSendArticleNotifications-role',
        NOTIFICATION_STATE_MACHINE_RESOURCE:
          'arn:aws:lambda:${self:provider.region}:${self:custom.awsAccountId}:function:pressArticles-prod-sendArticleNotifications',
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
      REACT_APP_SSR_URL:
        '${self:custom.${self:provider.stage}.${self:provider.region}.REACT_APP_SSR_URL}',
      NOTIFICATION_STATE_MACHINE_NAME:
        '${self:custom.${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_NAME}',
      NOTIFICATION_STATE_MACHINE_ROLE:
        '${self:custom.${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_ROLE}',
      NOTIFICATION_STATE_MACHINE_RESOURCE:
        '${self:custom.${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_RESOURCE}',
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
            Action: ['states:CreateStateMachine', 'states:StartExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:${self:custom.awsAccountId}:stateMachine:${file(../blast/env.notificationStateMachine.yml):${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_NAME}',
          },
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource:
              '${file(../blast/env.notificationStateMachine.yml):${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_ROLE}',
          },
          {
            Effect: 'Allow',
            Action: ['states:StopExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:${self:custom.awsAccountId}:execution:${file(../blast/env.notificationStateMachine.yml):${self:provider.stage}.${self:provider.region}.NOTIFICATION_STATE_MACHINE_ROLE}:${self:provider.stage}*',
          },
          {
            Effect: 'Allow',
            Action: ['states:StopExecution'],
            Resource:
              'arn:aws:states:${self:provider.region}:${self:custom.awsAccountId}:execution:${self:provider.environment.NOTIFICATION_STATE_MACHINE_NAME}:${self:provider.stage}*',
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
    sendArticleNotifications: {
      handler: 'handlers/sendArticleNotifications.default',
    },
    getArticles: {
      handler: 'handlers/getArticles.default',
      events: [
        {
          http: {
            path: 'press/articles/',
            method: 'get',
            cors: true,
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
        {
          http: {
            path: 'press/articles/v2/',
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
    getAllArticles: {
      handler: 'handlers/getAllArticles.default',
      events: [
        {
          http: {
            path: 'admin/press/articlesAll/',
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
    getArticlesByCategoryId: {
      handler: 'handlers/getArticlesByCategoryId.default',
      events: [
        {
          http: {
            path: 'admin/press/articlesByCategoryId/',
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
    getArticlesFrom: {
      handler: 'handlers/getArticlesFrom.default',
      events: [
        {
          http: {
            path: 'admin/press/articlesFrom',
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
    getPurchasedArticles: {
      handler: 'handlers/getPurchasedArticles.default',
      events: [
        {
          http: {
            path: 'press/purchasedArticles/',
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
    getArticle: {
      handler: 'handlers/getArticle.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}',
            method: 'get',
            cors: true,
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
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
      ],
    },
    getArticleShareUrl: {
      handler: 'handlers/getArticleShareUrl.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/shareUrl',
            method: 'get',
            cors: true,
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
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
      ],
    },
    getArticleDraft: {
      handler: 'handlers/getArticleDraft.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/draft',
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
                paths: {
                  id: true,
                },
              },
            },
          },
        },
      ],
    },
    postArticle: {
      handler: 'handlers/postArticle.default',
      events: [
        {
          http: {
            path: 'press/articles',
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
                querystrings: {
                  autoPublish: false,
                  forceCategoryId: false,
                  forcePictures: false,
                  xmlTagMapper: false,
                },
              },
            },
          },
        },
      ],
    },
    putArticle: {
      handler: 'handlers/putArticle.default',
      events: [
        {
          http: {
            path: 'press/articles',
            method: 'put',
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
    publishArticle: {
      handler: 'handlers/publishArticle.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/publish',
            method: 'put',
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
    renderArticle: {
      handler: 'handlers/renderArticle.default',
      events: [
        {
          http: {
            path: 'admin/press/renderArticle',
            method: 'put',
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
    generateContent: {
      handler: 'handlers/generateContent.default',
      events: [
        {
          http: {
            path: 'admin/press/articles/generate',
            method: 'put',
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
    getArticlesStats: {
      handler: 'handlers/getArticlesStats.default',
      events: [
        {
          http: {
            path: 'admin/press/articles/stats',
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
    generatedContentStatus: {
      handler: 'handlers/generatedContentStatus.default',
      events: [
        {
          http: {
            path: 'admin/press/articles/generated/{id}',
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
    unpublishArticle: {
      handler: 'handlers/unpublishArticle.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/unpublish',
            method: 'put',
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
    purchaseArticle: {
      handler: 'handlers/purchaseArticle.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/purchase',
            method: 'post',
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
    addLikeArticle: {
      handler: 'handlers/addLikeArticle.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/like',
            method: 'put',
            cors: true,
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
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
      ],
    },
    addViewArticle: {
      handler: 'handlers/addViewArticle.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/view',
            method: 'put',
            cors: true,
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
            authorizer: {
              type: 'CUSTOM',
              authorizerId:
                '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerPublicId}',
            },
          },
        },
      ],
    },
    getArticleModals: {
      handler: 'handlers/getArticleModals.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}/modals',
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
    removeArticle: {
      handler: 'handlers/removeArticle.default',
      events: [
        {
          http: {
            path: 'press/articles/{id}',
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
      RestApiRootResourcePressId: {
        Description: 'Api Gateway pressArticles ID',
        Value: {
          Ref: 'ApiGatewayResourcePressArticles',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourcePressId',
        },
      },
      RestApiRootResourcePressArticlesId: {
        Description: 'Api Gateway pressArticlesIdVar ID',
        Value: {
          Ref: 'ApiGatewayResourcePressArticlesIdVar',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourcePressArticlesId',
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
