import request from 'request-promise-native';

const OPENSEA_BASE_URL = 'https://api.opensea.io/api/v1';

function OpenSeaApi(apiKey) {
  if (!(this instanceof OpenSeaApi)) {
    return new OpenSeaApi(apiKey);
  }

  this.apiKey = apiKey;
}

OpenSeaApi.prototype.call = async function call(path, data = null, options = {
  body: 'querystring',
  headers: {},
  method: 'GET',
}) {
  const uri = `${OPENSEA_BASE_URL}${path}`;
  const params = {
    method: (options.method || 'GET'),
    uri,
    headers: {
      'X-API-KEY': this.apiKey,
      ...(options.headers || {}),
    },
  };

  if (data !== null) {
    if (options.body === 'form') {
      params.form = data;
    } else if (options.body === 'raw') {
      params.body = data;
    } else if (options.body === 'querystring') {
      const urlObj = new URL(uri);
      Object.keys(data).forEach((k) => {
        urlObj.searchParams.append(k, data[k]);
      });
      params.uri = urlObj.toString();
    } else {
      params.json = data;
    }
  }

  const rawResponse = await request(params);

  return (rawResponse);
};

export {
  OpenSeaApi,
};
