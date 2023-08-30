import jwt from 'jsonwebtoken';
import request from 'request-promise-native';

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import Random from '../../libs/account_utils/random';
import hashLoginToken from './hashLoginToken';

const {
  COLL_APPS,
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

async function runRequest(method, uri, options = {}) {
  const params = {
    method,
    uri,
    headers: options.headers || {},
  };

  const {
    body = 'urlenc',
    data = {},
  } = options;
  if (body === 'form') {
    params.form = data;
  } else if (body === 'urlenc') {
    const encoder = new URLSearchParams();
    Object.keys(data).forEach((key) => {
      encoder.append(key, data[key]);
    });
    params.body = encoder.toString();
  } else if (body === 'raw') {
    params.body = data;
  } else {
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
}

export default async (appId, urlArgs) => {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({
        _id: appId,
      });

    if (!app || !app.settings || !app.settings.oauth) {
      throw new Error('app_not_found');
    }

    if (appId !== '2d33cf6c-bbc9-490e-bcfd-06eafd5a07ed') throw new Error('not_implemented!');

    const { code } = urlArgs;
    const { tokenUrl } = app.settings.oauth;

    const response1 = await runRequest(tokenUrl.method, tokenUrl.url, {
      headers: tokenUrl.headers,
      data: {
        grant_type: 'authorization_code',
        code,
      },
    });

    if (!response1.id_token) {
      throw new Error('Missing variable : id_token');
    }

    const jwtToken = response1.id_token;

    const {
      /* iss, */
      /* sub, */
      /* aud, */
      /* ID,  */
      /* id,  */
      /* iat, */
      exp,
      auth_time: authTime,
      qr_code_content: qrCodeContent,
      first_name: firstname,
      last_name: lastname,
      nickname: username,
      avatar,
    } = jwt.decode(jwtToken);

    let user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({
        username,
      });

    const token = Random.secret();
    if (!user) {
      const badges = (await client
        .db()
        .collection(COLL_USER_BADGES)
        .find({ appId, isDefault: true })
        .toArray())
        .map((badge) => ({ id: badge._id }));

      user = {
        _id: Random.id(),
        createdAt: new Date(),
        username,
        services: {
          oauth: {
            exp,
            authTime,
            avatar,
            qrCodeContent,
          },
          resume: {
            loginTokens: [{
              hashedToken: hashLoginToken(token),
              when: new Date(),
            }],
          },
        },
        appId,
        profile: {
          firstname,
          lastname,
          username: `${firstname} ${lastname}`,
        },
        badges,
      };

      await client.db().collection(COLL_USERS).insertOne(user);
    } else {
      await client.db().collection(COLL_USERS).updateOne({
        _id: user._id,
        appId,
        username,
      }, {
        $set: {
          'services.oauth.exp': exp,
          'services.oauth.authTime': authTime,
          'services.oauth.avatar': avatar,
          'services.oauth.qrCodeContent': qrCodeContent,
        },
        $addToSet: {
          'services.resume.loginTokens': {
            hashedToken: hashLoginToken(token),
            when: new Date(),
          },
        },
      });
    }

    const successRetUrl = new URL('https://crowdaa.com/api/oauth/callback/success');
    successRetUrl.searchParams.append('userId', user._id);
    successRetUrl.searchParams.append('username', user.username);
    successRetUrl.searchParams.append('profileUsername', user.profile.username);
    successRetUrl.searchParams.append('authToken', token);
    successRetUrl.searchParams.append('authType', 'oauth');
    successRetUrl.searchParams.append('autoLoginToken', (
      user.services.wordpress &&
      user.services.wordpress.autoLoginToken
    ));

    return (successRetUrl.toString());
  } finally {
    client.close();
  }
};
