// First deployment :
// - comment MethodSettings, restApiGatewayDeployment and restApiBasePathMapping on first
// - deploy api-v1
// - run deploy script for others MS
// - uncomment previous then re-deploy api-v1
// This should now be done automatically using ./serverless-initial-deploy.yml and new changes in ../gitlab-ci and ../deployDiff.sh

/* eslint-disable no-template-curly-in-string */

const serverlessConfiguration = {
  service: 'api-v1',
  provider: {
    name: 'aws',
    stage: '${opt:stage, "dev"}',
    runtime: 'nodejs16.x',
    memorySize: 128,
    timeout: 30,
    region: '${opt:region, "us-east-1"}',
    deploymentBucket: 'ms-deployment-${self:provider.region}',
  },
  functions: {
    getV1: {
      handler: 'handler.handleGetV1',
      events: [
        {
          http: {
            path: '/',
            method: 'get',
            cors: true,
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
    'serverless-plugin-bind-deployment-id',
    'serverless-domain-manager',
  ],
  package: {
    individually: true,
  },
  custom: {
    logRetentionInDays: 30,
    prune: {
      automatic: true,
      number: 3,
    },
    'serverless-disable-request-validators': {
      action: 'delete',
    },
    mongoDB: {
      dev: {
        'us-east-1':
          'mongodb+srv://crowdaa-microservices:PQZwfqQ0WMIRXfqmOGZ5SchFAe3aIJg@dev.ykqidgl.mongodb.net/crowdaaDev',
      },
      preprod: {
        'eu-west-3':
          'mongodb+srv://crowdaa-microservices:PQZwfqQ0WMIRXfqmOGZ5SchFAe3aIJg@preprod.vtd2k.mongodb.net/crowdaaDev?retryWrites=true&w=majority',
      },
      prod: {
        'us-east-1':
          'mongodb+srv://crowdaa-microservices:PQZwfqQ0WMIRXfqmOGZ5SchFAe3aIJg@crowdaa.vtd2k.mongodb.net/crowdaaDev?retryWrites=true&w=majority',
        'eu-west-3':
          'mongodb+srv://crowdaa-microservices:PQZwfqQ0WMIRXfqmOGZ5SchFAe3aIJg@prodfr.vtd2k.mongodb.net/crowdaaDev?retryWrites=true&w=majority',
      },
    },
    domains: {
      prod: {
        'us-east-1': 'api.aws.crowdaa.com',
        'eu-west-3': 'api-fr.aws.crowdaa.com',
      },
      preprod: {
        'eu-west-3': 'preprod-api.aws.crowdaa.com',
      },
      dev: {
        'us-east-1': 'dev-api.aws.crowdaa.com',
      },
      defJam: {
        'us-east-1': 'defjam-api.aws.crowdaa.com',
      },
      awax: {
        'eu-west-1': 'awax-api.aws.crowdaa.com',
      },
      awaxDev: {
        'eu-west-1': 'awax-dev-api.aws.crowdaa.com',
      },
    },
    adminApp: {
      prod: {
        'us-east-1': 'cf72c7c3-ae67-42f9-963c-adc9a3211726',
        'eu-west-3': 'cf72c7c3-ae67-42f9-963c-adc9a3211726',
      },
      preprod: {
        'eu-west-3': 'cf72c7c3-ae67-42f9-963c-adc9a3211726',
      },
      dev: {
        'us-east-1': 'crowdaa_app_id',
      },
      defJam: {
        'us-east-1': 'crowdaa_app_id',
      },
      awax: {
        'eu-west-1': 'cf72c7c3-ae67-42f9-963c-adc9a3211726',
      },
      awaxDev: {
        'eu-west-1': 'crowdaa_app_id',
      },
    },
    customDomain: {
      basePath: 'v1',
      domainName:
        '${self:custom.domains.${self:provider.stage}.${self:provider.region}}',
      endpointType: 'regional',
      stage: '${self:provider.stage}',
      createRoute53Record: true,
    },
    MAILGUN_API_KEY: {
      dev: 'key-ee8f3c350f56cbe4002b9c00cce04769',
      preprod: 'key-ee8f3c350f56cbe4002b9c00cce04769',
      prod: 'key-ee8f3c350f56cbe4002b9c00cce04769',
      awax: 'key-ee8f3c350f56cbe4002b9c00cce04769',
      awaxDev: 'key-ee8f3c350f56cbe4002b9c00cce04769',
    },
    MAILGUN_DOMAIN: {
      dev: 'mg.crowdaa.com',
      preprod: 'mg.crowdaa.com',
      prod: 'mg.crowdaa.com',
      awax: 'mg.crowdaa.com',
      awaxDev: 'mg.crowdaa.com',
    },
    DASHBOARD_V2_DOMAIN: {
      dev: 'app.crowdaa.com',
      preprod: 'app.crowdaa.com',
      prod: 'app.crowdaa.com',
    },
    esbuild: {
      config: '../esbuild.config.cjs',
    },
    crowdaaRegion: {
      dev: {
        'us-east-1': 'us',
      },
      preprod: {
        'eu-west-3': 'fr',
      },
      prod: {
        'us-east-1': 'us',
        'eu-west-3': 'fr',
      },
    },
  },
  //   See https://github.com/serverless/serverless/issues/4029#issuecomment-386045929
  //   restApiBasePathMapping:
  //     Type: AWS::ApiGateway::BasePathMapping
  //     DependsOn: restApiGatewayDeployment
  //     Properties:
  //       BasePath: "v1"
  //       DomainName: ${self:custom.domains.${self:provider.stage}:${self:provider.region}}
  //       RestApiId:
  //         Ref: ApiGatewayRestApi
  //       Stage: ${self:provider.stage}
  // remove  when first deploy --- END1
  resources: {
    Resources: {
      ApiGatewayStage: {
        Type: 'AWS::ApiGateway::Stage',
        Properties: {
          StageName: '${self:provider.stage}',
          Description: 'stage of api-v1',
          RestApiId: {
            Ref: 'ApiGatewayRestApi',
          },
          DeploymentId: {
            Ref: '__deployment__',
          },
          CacheClusterEnabled: true,
          CacheClusterSize: '0.5',
          MethodSettings: [
            {
              ResourcePath: '/*',
              CachingEnabled: false,
              HttpMethod: '*',
              LoggingLevel: 'INFO',
              MetricsEnabled: true,
            },
            {
              ResourcePath: '/artists/{id}',
              CacheTtlInSeconds: 3600,
              CachingEnabled: true,
              HttpMethod: 'GET',
              LoggingLevel: 'INFO',
              MetricsEnabled: true,
            },
            {
              ResourcePath: '/audios/{id}',
              CacheTtlInSeconds: 3600,
              CachingEnabled: true,
              HttpMethod: 'GET',
              LoggingLevel: 'INFO',
              MetricsEnabled: true,
            },
            {
              ResourcePath: '/crowd',
              CacheDataEncrypted: true,
              CacheTtlInSeconds: 3600,
              CachingEnabled: true,
              HttpMethod: 'GET',
              LoggingLevel: 'INFO',
              MetricsEnabled: true,
            },
            {
              ResourcePath: '/selections',
              CacheTtlInSeconds: 3600,
              CachingEnabled: true,
              HttpMethod: 'GET',
              LoggingLevel: 'INFO',
              MetricsEnabled: true,
            },
            {
              ResourcePath: '/selections/{id}',
              CacheTtlInSeconds: 3600,
              CachingEnabled: true,
              HttpMethod: 'GET',
              LoggingLevel: 'INFO',
              MetricsEnabled: true,
            },
          ],
        },
      },
      restApiGatewayDeployment: {
        Type: 'AWS::ApiGateway::Deployment',
        DependsOn: 'ApiGatewayMethodGet',
        Properties: {
          Description: '${self:provider.stage} Environment',
          RestApiId: {
            Ref: 'ApiGatewayRestApi',
          },
          StageName: '${self:provider.stage}',
        },
      },
    },
    Outputs: {
      ApiGatewayStage: {
        Description: 'Api Gateway Stage',
        Value: {
          Ref: 'ApiGatewayStage',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:ApiGatewayStage',
        },
      },
      MongoURL: {
        Description: 'MongoDB URL',
        Value:
          '${self:custom.mongoDB.${self:provider.stage}.${self:provider.region}}',
        Export: {
          Name: '${self:service}:${self:provider.stage}:MongoURL',
        },
      },
      AdminApp: {
        Description: 'Admin App ID',
        Value:
          '${self:custom.adminApp.${self:provider.stage}.${self:provider.region}}',
        Export: {
          Name: '${self:service}:${self:provider.stage}:AdminApp',
        },
      },
      MailgunApiKey: {
        Description: 'MAILGUN API KEY',
        Value: '${self:custom.MAILGUN_API_KEY.${self:provider.stage}}',
        Export: {
          Name: '${self:service}:${self:provider.stage}:MailgunApiKey',
        },
      },
      MailgunDomain: {
        Description: 'MAILGUN DOMAIN',
        Value: '${self:custom.MAILGUN_DOMAIN.${self:provider.stage}}',
        Export: {
          Name: '${self:service}:${self:provider.stage}:MailgunDomain',
        },
      },
      RestApiId: {
        Description: 'Api Gateway ID',
        Value: {
          Ref: 'ApiGatewayRestApi',
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiId',
        },
      },
      RestApiRootResourceId: {
        Description: 'Api Gateway ID',
        Value: {
          'Fn::GetAtt': ['ApiGatewayRestApi', 'RootResourceId'],
        },
        Export: {
          Name: '${self:service}:${self:provider.stage}:RestApiRootResourceId',
        },
      },
    },
  },
};
module.exports = serverlessConfiguration;
