const APIGateway = require('aws-sdk/clients/apigateway');
const find = require('lodash/find');

const apigateway = new APIGateway({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAJGROD5HF6C67HFHA',
    secretAccessKey: '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',
  },
});

module.exports.generateMethodSettings = async ({ processedInput }) => {
  const stage = processedInput.stage || 'dev';
  const restAPIs = await apigateway.getRestApis().promise();
  const restApi = find(restAPIs.items, { name: `${stage}-api-v1` });
  const { items } = await apigateway.getResources({ restApiId: restApi.id, limit: 500 }).promise();
  const methodsSettings = [];
  items.forEach(({ path, resourceMethods }) => {
    if (resourceMethods) {
      Object.keys(resourceMethods).forEach((methodType) => {
        const settings = {
          ResourcePath: path,
          HttpMethod: methodType,
          CachingEnabled: false,
        };
        if (path === '/artists/{id}' && methodType === 'GET') {
          settings.CachingEnabled = true;
          settings.CacheTtlInSeconds = 3600;
          settings.CacheDataEncrypted = true;
        }
        if (path === '/audios/{id}' && methodType === 'GET') {
          settings.CachingEnabled = true;
          settings.CacheTtlInSeconds = 3600;
          settings.CacheDataEncrypted = true;
        }
        if (path === '/crowd' && methodType === 'GET') {
          settings.CachingEnabled = true;
          settings.CacheTtlInSeconds = 3600;
          settings.CacheDataEncrypted = true;
        }
        if (path === '/selections' && methodType === 'GET') {
          settings.CachingEnabled = true;
          settings.CacheTtlInSeconds = 3600;
          settings.CacheDataEncrypted = true;
        }
        if (path === '/selections/{id}' && methodType === 'GET') {
          settings.CachingEnabled = true;
          settings.CacheTtlInSeconds = 3600;
          settings.CacheDataEncrypted = true;
        }
        methodsSettings.push(settings);
      });
    }
  });
  return methodsSettings;
};
