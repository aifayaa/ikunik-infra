/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

function WordpressAPI(app) {
  if (!(this instanceof WordpressAPI)) {
    return new WordpressAPI(app);
  }

  if (!app.backend) {
    throw new Error('no_backend');
  }
  if (app.backend.type !== 'wordpress') {
    throw new Error('invalid_backend_type');
  }
  if (!app.backend.url) {
    throw new Error('incomplete_backend');
  }

  this.app = app;
}

WordpressAPI.prototype.call = async function call(
  method,
  path,
  data,
  options = {
    body: 'json',
  }
) {
  const uri = `${this.app.backend.url}${path}`;
  const params = {
    method,
    uri,
    headers: {},
  };

  if (this.app.backend.apiKey) {
    params.headers['X-Crowdaa-Api-Key'] = this.app.backend.apiKey;
  }

  if (options.body === 'form') {
    params.form = data;
  } else if (options.body === 'raw') {
    params.body = data;
  } else if (data !== undefined) {
    params.json = data;
  }

  if (options.headers) {
    params.headers = {
      ...params.headers,
      ...options.headers,
    };
  }

  const rawResponse = await request(params);

  return rawResponse;
};

WordpressAPI.prototype.authCall = async function authCall(
  method,
  path,
  bearer,
  data,
  options = {
    body: 'json',
  }
) {
  const finalOptions = { ...options };

  if (!finalOptions.headers) finalOptions.headers = {};

  finalOptions.headers.Authorization = `Bearer ${bearer}`;

  const response = await this.call(method, path, data, finalOptions);

  return response;
};

export { WordpressAPI };
