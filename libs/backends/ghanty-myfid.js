import request from 'request-promise-native';
import mongoCollections from '../mongoCollections.json';

const {
  COLL_APPS,
} = mongoCollections;

function MyFidApi(app) {
  if (!(this instanceof MyFidApi)) {
    return new MyFidApi(app);
  }

  if (!app.settings.myfidbackend) {
    throw new Error('no_backend');
  }

  this.app = app;
  this.myfidbackend = { ...app.settings.myfidbackend };
}

MyFidApi.prototype.isLoggedIn = function isLoggedIn() {
  const aBitLaterDate = new Date(Date.now() + 30 * 1000);
  if (
    !this.myfidbackend.accessToken.value ||
    this.myfidbackend.accessToken.expires <= aBitLaterDate
  ) {
    return (false);
  }

  return (true);
};

MyFidApi.prototype.renewTokenIfNeeded = async function renewTokenIfNeeded(client) {
  if (this.isLoggedIn()) {
    return (false);
  }

  const body = new URLSearchParams();
  if (this.myfidbackend.loginBody) {
    Object.keys(this.myfidbackend.loginBody).forEach((key) => {
      body.append(key, this.myfidbackend.loginBody[key]);
    });
  }

  const params = {
    method: 'POST',
    url: this.myfidbackend.loginUrl,
    body: body.toString(),
  };

  let response = await request(params);

  if (typeof response === 'string') {
    response = JSON.parse(response);
  }

  const {
    token_type: tokenType,
    expires_in: expiresIn,
    access_token: accessToken,
  } = response;

  this.myfidbackend.accessToken.value = accessToken;
  this.myfidbackend.accessToken.expires = new Date(Date.now() + expiresIn * 1000);
  this.myfidbackend.accessToken.tokenType = tokenType;

  await client.db().collection(COLL_APPS).updateOne({ _id: this.app._id }, { $set: {
    'settings.myfidbackend.accessToken': this.myfidbackend.accessToken,
  } });

  return (true);
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

  if (this.myfidbackend.accessToken.value) {
    params.headers.Authorization = `${this.myfidbackend.accessToken.tokenType} ${this.myfidbackend.accessToken.value}`;
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

  return (response);
};

MyFidApi.prototype.userLogin = async function userLogin(username, password) {
  const uri = this.myfidbackend.userLoginUrl;
  const params = {
    method: 'POST',
    uri,
    headers: {},
  };

  const body = new URLSearchParams();
  Object.keys(this.myfidbackend.userLoginBody).forEach((key) => {
    body.append(key, this.myfidbackend.userLoginBody[key]);
  });

  body.append('username', username);
  body.append('password', password);

  params.body = body.toString();

  let response = await request(params);

  if (typeof response === 'string') {
    response = JSON.parse(response);
  }

  return (response);
};

export {
  MyFidApi,
};
