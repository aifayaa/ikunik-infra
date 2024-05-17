/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

function AfrikPayApi(app) {
  if (!(this instanceof AfrikPayApi)) {
    return new AfrikPayApi(app);
  }

  if (!app.settings.afrikpay) {
    throw new Error('no_backend');
  }

  this.app = app;
  this.afrikpay = { ...app.settings.afrikpay };
}

AfrikPayApi.prototype.call = async function call(path, options = {}) {
  const {
    body = null,
    bodyFormat = 'json',
    headers = {},
    method = 'GET',
    terminalId = '0000000000',
    bearer = null,
    basic = null,
  } = options;

  const uri = `${this.afrikpay.apiUrl}${path}`;
  const params = {
    method,
    uri,
    headers: {
      ...(this.afrikpay.apiHeaders || {}),
      'Terminal-Identifier': terminalId,
    },
  };

  if (bearer) {
    params.headers.Authorization = `Bearer ${bearer}`;
  } else if (basic) {
    params.headers.Authorization = `Basic ${basic}`;
  }

  if (bodyFormat === 'form') {
    params.form = body;
  } else if (bodyFormat === 'raw') {
    params.body = body;
  } else {
    params.json = body;
  }

  params.headers = {
    ...params.headers,
    ...headers,
  };

  let response = await request(params);

  if (typeof response === 'string') {
    response = JSON.parse(response);
  }

  return response;
};

export { AfrikPayApi };
