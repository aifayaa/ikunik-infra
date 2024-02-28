/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

const OPENSEA_BASE_URL = 'https://api.opensea.io/api/v1';
const CRYPTO_API_KEY = 'f30e7b3983f74fff9317687c324d94b3';

function OpenSeaApi() {
  if (!(this instanceof OpenSeaApi)) {
    return new OpenSeaApi();
  }
}

OpenSeaApi.prototype.call = async function call(
  path,
  data = null,
  options = {
    body: 'querystring',
    headers: {},
    method: 'GET',
  }
) {
  const uri = `${OPENSEA_BASE_URL}${path}`;
  const params = {
    method: options.method || 'GET',
    uri,
    headers: {
      'X-API-KEY': CRYPTO_API_KEY,
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

  if (typeof rawResponse === 'string') {
    try {
      return JSON.parse(rawResponse);
    } catch (e) {
      /* . */
    }
  }

  return rawResponse;
};

export { OpenSeaApi };
