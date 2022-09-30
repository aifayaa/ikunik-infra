import request from 'request-promise-native';

const BASE_URL = 'https://api.chatengine.io';

function ChatEngineAPI(app) {
  if (!(this instanceof ChatEngineAPI)) {
    return new ChatEngineAPI(app);
  }

  if (!app.credentials) {
    throw new Error('no_credentials');
  }
  if (!app.credentials.chatengine) {
    throw new Error('no_chat_credentials');
  }

  this.credentials = app.credentials.chatengine;
}

ChatEngineAPI.prototype.call = async function call(method, path, data, options = {
  body: 'json',
}) {
  const uri = `${BASE_URL}${path}`;
  const params = {
    method,
    uri,
    headers: {
      'PRIVATE-KEY': this.credentials.privateKey,
    },
  };

  if (options.body === 'form') {
    params.form = data;
  } else if (options.body === 'raw') {
    params.body = data;
  } else if (options.body === 'json') {
    params.json = data;
  }

  if (options.headers) {
    params.headers = {
      ...params.headers,
      ...options.headers,
    };
  }

  const rawResponse = await request(params);

  return (rawResponse);
};

export {
  ChatEngineAPI,
};
