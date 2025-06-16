/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'account',
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    stage: '${opt:stage, "dev"}',
    memorySize: 128,
    timeout: 30,
    environment: '${file(../env.js)}',
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    authorize: {
      handler: 'handlers/authorize.default',
    },
    authorizeNoApp: {
      handler: 'handlers/authorizeNoApp.default',
    },
    authorizeArtist: {
      handler: 'handlers/authorizeArtist.default',
    },
    authorizeRole: {
      handler: 'handlers/authorizeRole.default',
    },
    authorizeWithPerms: {
      handler: 'handlers/authorizeWithPerms.default',
    },
    authorizePublic: {
      handler: 'handlers/authorizePublic.default',
    },
    authorizeAdmin: {
      handler: 'handlers/authorizeAdmin.default',
    },
  },
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-disable-request-validators',
    'serverless-prune-plugin',
    'serverless-plugin-log-retention',
  ],
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
  package: {
    individually: true,
  },
  resources: {
    Resources: {
      ApiGatewayAuthorizer: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          AuthorizerResultTtlInSeconds: 0,
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref: 'AWS::Region',
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt': ['AuthorizeLambdaFunction', 'Arn'],
                },
                '/invocations',
              ],
            ],
          },
          IdentitySource:
            'method.request.header.Authorization, method.request.header.X-Api-Key',
          Name: 'authorizeAuthorizer',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          Type: 'REQUEST',
          ProviderARNs: [
            {
              'Fn::GetAtt': ['AuthorizeLambdaFunction', 'Arn'],
            },
          ],
        },
      },
      ApiGatewayAuthorizerNoApp: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          AuthorizerResultTtlInSeconds: 0,
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref: 'AWS::Region',
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt': ['AuthorizeNoAppLambdaFunction', 'Arn'],
                },
                '/invocations',
              ],
            ],
          },
          IdentitySource: 'method.request.header.Authorization',
          Name: 'authorizeNoApp',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          Type: 'REQUEST',
          ProviderARNs: [
            {
              'Fn::GetAtt': ['AuthorizeNoAppLambdaFunction', 'Arn'],
            },
          ],
        },
      },
      AuthorizeLambdaPermissionApiGateway: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['AuthorizeLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: {
            'Fn::Join': [
              '',
              [
                'apigateway.',
                {
                  Ref: 'AWS::URLSuffix',
                },
              ],
            ],
          },
        },
      },
      AuthorizeNoAppLambdaPermissionApiGateway: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['AuthorizeNoAppLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: {
            'Fn::Join': [
              '',
              [
                'apigateway.',
                {
                  Ref: 'AWS::URLSuffix',
                },
              ],
            ],
          },
        },
      },
      AuthorizeArtistLambdaPermissionApiGateway: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['AuthorizeArtistLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: {
            'Fn::Join': [
              '',
              [
                'apigateway.',
                {
                  Ref: 'AWS::URLSuffix',
                },
              ],
            ],
          },
        },
      },
      AuthorizeRoleLambdaPermissionApiGateway: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['AuthorizeRoleLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: {
            'Fn::Join': [
              '',
              [
                'apigateway.',
                {
                  Ref: 'AWS::URLSuffix',
                },
              ],
            ],
          },
        },
      },
      AuthorizeWithPermsLambdaPermissionApiGateway: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['AuthorizeWithPermsLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: {
            'Fn::Join': [
              '',
              [
                'apigateway.',
                {
                  Ref: 'AWS::URLSuffix',
                },
              ],
            ],
          },
        },
      },
      ApiGatewayResponseDenied: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          ResponseParameters: {
            'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
            'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
            'gatewayresponse.header.Access-Control-Allow-Credentials': "'true'",
          },
          ResponseTemplates: {
            'application/json': '{"message":"forbidden"}',
          },
          ResponseType: 'ACCESS_DENIED',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          StatusCode: '403',
        },
      },
      ApiGatewayAuthorizerArtist: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          AuthorizerResultTtlInSeconds: 0,
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref: 'AWS::Region',
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt': ['AuthorizeArtistLambdaFunction', 'Arn'],
                },
                '/invocations',
              ],
            ],
          },
          IdentitySource:
            'method.request.header.Authorization, method.request.header.X-Api-Key',
          Name: 'authorizeArtistAuthorizer',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          Type: 'REQUEST',
          ProviderARNs: [
            {
              'Fn::GetAtt': ['AuthorizeArtistLambdaFunction', 'Arn'],
            },
          ],
        },
      },
      ApiGatewayAuthorizerRole: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          AuthorizerResultTtlInSeconds: 0,
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref: 'AWS::Region',
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt': ['AuthorizeRoleLambdaFunction', 'Arn'],
                },
                '/invocations',
              ],
            ],
          },
          IdentitySource:
            'method.request.header.Authorization, method.request.header.X-Api-Key',
          Name: 'authorizeRoleAuthorizer',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          Type: 'REQUEST',
          ProviderARNs: [
            {
              'Fn::GetAtt': ['AuthorizeRoleLambdaFunction', 'Arn'],
            },
          ],
        },
      },
      ApiGatewayAuthorizerWithPerms: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          AuthorizerResultTtlInSeconds: 0,
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref: 'AWS::Region',
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt': ['AuthorizeWithPermsLambdaFunction', 'Arn'],
                },
                '/invocations',
              ],
            ],
          },
          IdentitySource:
            'method.request.header.Authorization, method.request.header.X-Api-Key',
          Name: 'authorizeWithPermsAuthorizer',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          Type: 'REQUEST',
          ProviderARNs: [
            {
              'Fn::GetAtt': ['AuthorizeWithPermsLambdaFunction', 'Arn'],
            },
          ],
        },
      },
      ApiGatewayAuthorizerPublic: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          AuthorizerResultTtlInSeconds: 0,
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref: 'AWS::Region',
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt': ['AuthorizePublicLambdaFunction', 'Arn'],
                },
                '/invocations',
              ],
            ],
          },
          Name: 'authorizePublicAuthorizer',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          Type: 'REQUEST',
          ProviderARNs: [
            {
              'Fn::GetAtt': ['AuthorizePublicLambdaFunction', 'Arn'],
            },
          ],
        },
      },
      AuthorizePublicLambdaPermissionApiGateway: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['AuthorizePublicLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: {
            'Fn::Join': [
              '',
              [
                'apigateway.',
                {
                  Ref: 'AWS::URLSuffix',
                },
              ],
            ],
          },
        },
      },
      ApiGatewayAuthorizerAdmin: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          AuthorizerResultTtlInSeconds: 0,
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref: 'AWS::Region',
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt': ['AuthorizeAdminLambdaFunction', 'Arn'],
                },
                '/invocations',
              ],
            ],
          },
          Name: 'authorizeAdminAuthorizer',
          RestApiId: '${cf:api-v1-${self:provider.stage}.RestApiId}',
          Type: 'REQUEST',
          ProviderARNs: [
            {
              'Fn::GetAtt': ['AuthorizeAdminLambdaFunction', 'Arn'],
            },
          ],
        },
      },
      AuthorizeAdminLambdaPermissionApiGateway: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['AuthorizeAdminLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: {
            'Fn::Join': [
              '',
              [
                'apigateway.',
                {
                  Ref: 'AWS::URLSuffix',
                },
              ],
            ],
          },
        },
      },
    },
    Outputs: {
      ApiGatewayAuthorizerId: {
        Description: 'User authorizer ID',
        Value: {
          Ref: 'ApiGatewayAuthorizer',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayAuthorizerId',
        },
      },
      ApiGatewayAuthorizerNoAppId: {
        Description: 'User NoApp authorizer ID',
        Value: {
          Ref: 'ApiGatewayAuthorizerNoApp',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayAuthorizerNoAppId',
        },
      },
      ApiGatewayAuthorizerArtistId: {
        Description: 'Artist authorizer ID',
        Value: {
          Ref: 'ApiGatewayAuthorizerArtist',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayAuthorizerArtistId',
        },
      },
      ApiGatewayAuthorizerRoleId: {
        Description: 'Role authorizer ID',
        Value: {
          Ref: 'ApiGatewayAuthorizerRole',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayAuthorizerRoleId',
        },
      },
      ApiGatewayAuthorizerWithPermsId: {
        Description: 'Perms authorizer ID',
        Value: {
          Ref: 'ApiGatewayAuthorizerWithPerms',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayAuthorizerWithPermsId',
        },
      },
      ApiGatewayAuthorizerPublicId: {
        Description: 'public authorizer ID',
        Value: {
          Ref: 'ApiGatewayAuthorizerPublic',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayAuthorizerPublicId',
        },
      },
      ApiGatewayAuthorizerAdminId: {
        Description: 'Admin authorizer ID',
        Value: {
          Ref: 'ApiGatewayAuthorizerAdmin',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayAuthorizerAdminId',
        },
      },
    },
  },
};
module.exports = serverlessConfiguration;
