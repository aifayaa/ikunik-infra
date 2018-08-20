const APIGateway = require('aws-sdk/clients/apigateway');

const apigateway = new APIGateway({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAJGROD5HF6C67HFHA',
    secretAccessKey: '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',
  },
});

module.exports.generateMethodSettings = async () => {
  const { items } = await apigateway.getResources({ restApiId: 'i4u7qd77k3', limit: 500 }).promise();
  const methodsSettings = [];
  items.forEach(({ path, resourceMethods }) => {
    if (resourceMethods) {
      Object.keys(resourceMethods).forEach((methodType) => {
        const settings = {
          ResourcePath: path,
          HttpMethod: methodType,
          CachingEnabled: false,
        };
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
