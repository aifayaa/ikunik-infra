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

WordpressAPI.prototype.call = async function call(method, path, data, options = {
  body: 'json',
}) {
  const uri = `${this.app.backend.url}${path}`;
  const params = {
    method,
    uri,
  };

  if (options.body === 'form') {
    params.form = data;
  } else if (options.body === 'raw') {
    params.body = data;
  } else {
    params.json = data;
  }

  if (options.headers) {
    params.headers = options.headers;
  }

  const rawResponse = await request(params);

  return (rawResponse);
};

export {
  WordpressAPI,
};
