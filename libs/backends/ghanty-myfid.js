/* eslint-disable import/no-relative-packages */
import { ofetch } from 'ofetch';
import request from 'request-promise-native';
import mongoCollections from '../mongoCollections.json';

const { COLL_APPS } = mongoCollections;

// const GHANTY_ENVIRONMENT = 'staging';

function MyFidApi(app) {
  if (!(this instanceof MyFidApi)) {
    return new MyFidApi(app);
  }

  if (!app.settings.myfidbackend) {
    throw new Error('no_backend');
  }

  this.app = app;
  // this.myfidbackend = { ...app.settings.myfidbackend[GHANTY_ENVIRONMENT] };
  this.myfidbackend = { ...app.settings.myfidbackend };
}

MyFidApi.prototype.isApiLoggedIn = function isApiLoggedIn() {
  const aBitLaterDate = new Date(Date.now() + 30 * 1000);
  if (
    !this.myfidbackend.apiAccessToken.value ||
    this.myfidbackend.apiAccessToken.expires <= aBitLaterDate
  ) {
    return false;
  }

  return true;
};

MyFidApi.prototype.isLoginLoggedIn = function isLoginLoggedIn() {
  const aBitLaterDate = new Date(Date.now() + 30 * 1000);
  if (
    !this.myfidbackend.accountApiAccessToken.value ||
    this.myfidbackend.accountApiAccessToken.expires <= aBitLaterDate
  ) {
    return false;
  }

  return true;
};

MyFidApi.prototype.renewAPITokenIfNeeded = async function renewAPITokenIfNeeded(
  client
) {
  if (this.isApiLoggedIn()) {
    return false;
  }

  const body = new URLSearchParams();
  if (this.myfidbackend.apiLoginBody) {
    Object.keys(this.myfidbackend.apiLoginBody).forEach((key) => {
      body.append(key, this.myfidbackend.apiLoginBody[key]);
    });
  }

  const params = {
    method: 'POST',
    url: this.myfidbackend.apiLoginUrl,
    body: body.toString(),
  };

  let response = await request(params);

  if (typeof response === 'string') {
    response = JSON.parse(response);
  }

  const {
    token_type: tokenType,
    expires_in: expiresIn,
    access_token: value,
  } = response;

  this.myfidbackend.apiAccessToken.value = value;
  this.myfidbackend.apiAccessToken.expires = new Date(
    Date.now() + expiresIn * 1000
  );
  this.myfidbackend.apiAccessToken.tokenType = tokenType;

  await client
    .db()
    .collection(COLL_APPS)
    .updateOne(
      { _id: this.app._id },
      {
        $set: {
          // [`settings.myfidbackend.${GHANTY_ENVIRONMENT}.apiAccessToken`]:
          [`settings.myfidbackend.apiAccessToken`]:
            this.myfidbackend.apiAccessToken,
        },
      }
    );

  return true;
};

MyFidApi.prototype.renewLoginTokenIfNeeded =
  async function renewLoginTokenIfNeeded(client) {
    if (this.isLoginLoggedIn()) {
      return false;
    }

    const body = new URLSearchParams();
    if (this.myfidbackend.accountApiAccessBody) {
      Object.keys(this.myfidbackend.accountApiAccessBody).forEach((key) => {
        body.append(key, this.myfidbackend.accountApiAccessBody[key]);
      });
    }

    const params = {
      method: 'POST',
      url: `${this.myfidbackend.accountApiUrl}/moserver/token`,
      body: body.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    console.log('renewLoginTokenIfNeeded params', params);

    let response = await request(params);

    if (typeof response === 'string') {
      response = JSON.parse(response);
    }

    const {
      token_type: tokenType,
      expires_in: expiresIn,
      access_token: value,
    } = response;

    this.myfidbackend.accountApiAccessToken.value = value;
    this.myfidbackend.accountApiAccessToken.expires = new Date(
      Date.now() + expiresIn * 1000
    );
    this.myfidbackend.accountApiAccessToken.tokenType = tokenType;

    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: this.app._id },
        {
          $set: {
            // [`settings.myfidbackend.${GHANTY_ENVIRONMENT}.accountApiAccessToken`]:
            [`settings.myfidbackend.accountApiAccessToken`]:
              this.myfidbackend.accountApiAccessToken,
          },
        }
      );

    return true;
  };

MyFidApi.prototype.call = async function call(path, options = {}) {
  const {
    body = null,
    bodyFormat = 'json',
    headers = {},
    method = 'GET',
  } = options;

  const uri = `${this.myfidbackend.apiUrl}${path}`;
  const params = {
    method,
    uri,
    headers: { ...this.myfidbackend.apiHeaders },
  };

  if (this.myfidbackend.apiAccessToken.value) {
    params.headers.Authorization = `${this.myfidbackend.apiAccessToken.tokenType} ${this.myfidbackend.apiAccessToken.value}`;
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

  if (typeof response === 'string' && response.length === 0) {
    response = {};
  }

  if (typeof response === 'string' && 2 <= response.length) {
    response = JSON.parse(response);
  }

  return response;
};

MyFidApi.prototype.callFetchRaw = async function calloFetch(
  path,
  options = {}
) {
  const { body = null, headers = {}, method = 'GET' } = options;

  const uri = `${this.myfidbackend.apiUrl}${path}`;
  const effectiveOptions = {};
  effectiveOptions.method = method;
  effectiveOptions.body = body;
  effectiveOptions.headers = {
    ...headers,
    ...this.myfidbackend.apiHeaders,
  };

  if (this.myfidbackend.apiAccessToken.value) {
    effectiveOptions.headers.Authorization = `${this.myfidbackend.apiAccessToken.tokenType} ${this.myfidbackend.apiAccessToken.value}`;
  }

  const response = await ofetch.raw(uri, {
    parseResponse: (txt) => txt,
    ...effectiveOptions,
  });

  return response;
};

MyFidApi.prototype.authAPICall = async function authAPICall(
  path,
  options = {}
) {
  const {
    body = null,
    bodyFormat = 'json',
    headers = {},
    method = 'GET',
  } = options;

  const uri = `${this.myfidbackend.accountApiUrl}${path}`;
  const params = {
    method,
    uri,
    headers: {},
  };

  if (this.myfidbackend.accountApiAccessToken.value) {
    params.headers.Authorization = `${this.myfidbackend.accountApiAccessToken.tokenType} ${this.myfidbackend.accountApiAccessToken.value}`;
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

MyFidApi.prototype.checkUser = async function checkUser(username, password) {
  const uri = `${this.myfidbackend.accountApiUrl}/cartefid/v1/check-user`;
  const params = {
    method: 'POST',
    uri,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (this.myfidbackend.accountApiAccessToken.value) {
    params.headers.Authorization = `${this.myfidbackend.accountApiAccessToken.tokenType} ${this.myfidbackend.accountApiAccessToken.value}`;
  }

  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  params.body = body.toString();

  let response = await request(params);

  if (typeof response === 'string') {
    response = JSON.parse(response);
  }

  return response;
};

export { MyFidApi };
