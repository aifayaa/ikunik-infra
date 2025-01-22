/* eslint-disable import/no-relative-packages */
import jwt from 'jsonwebtoken';
import request from 'request-promise-native';
import QRCode from 'qrcode';
import fs from 'fs';
import https from 'https';
import Lambda from 'aws-sdk/clients/lambda';

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import Random from '../../libs/account_utils/random.ts';
import hashLoginToken from './hashLoginToken.ts';

const SUCCESS_URL = 'https://crowdaa.com/api/oauth/callback/success';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { COLL_APPS, COLL_PICTURES, COLL_USERS, COLL_USER_BADGES } =
  mongoCollections;

async function runRequest(method, uri, options = {}) {
  const params = {
    method,
    uri,
    headers: options.headers || {},
  };

  const { body = 'urlenc', data = {} } = options;
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

  try {
    const parsed = JSON.parse(rawResponse);
    return parsed;
  } catch (e) {
    /* do nothing */
  }

  return rawResponse;
}

async function callGetUploadUrlLambda(
  userId,
  appId,
  fileSize,
  fileName,
  fileType
) {
  const lambdaResponse = await lambda
    .invoke({
      FunctionName: `files-${process.env.STAGE}-getUploadUrl`,
      Payload: JSON.stringify({
        requestContext: {
          authorizer: {
            appId,
            principalId: userId,
          },
        },
        body: JSON.stringify({
          files: [
            {
              name: fileName,
              type: fileType,
              size: fileSize,
            },
          ],
          metadata: {},
        }),
      }),
    })
    .promise();

  const { Payload } = lambdaResponse;
  const { statusCode, body } = JSON.parse(Payload);
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Media upload URL generation error : ${body}`);
  }
  const [{ id, url }] = JSON.parse(body);
  return { id, url };
}

function uploadPngHttps(fileStream, fileSize, url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': fileSize,
      },
    };
    const req = https.request(url, options, (res) => {
      res.on('error', reject);
      res.on('data', () => {
        /* do nothing */
      });
      res.on('end', resolve);
    });

    req.on('error', reject);
    fileStream.pipe(req);
  });
}

export default async (appId, urlArgs) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({
      _id: appId,
    });

    if (!app || !app.settings || !app.settings.oauth) {
      throw new Error('app_not_found');
    }

    if (appId !== '2d33cf6c-bbc9-490e-bcfd-06eafd5a07ed')
      throw new Error('not_implemented!');

    const { code } = urlArgs;
    const { tokenUrl } = app.settings.oauth;

    const response = await runRequest(tokenUrl.method, tokenUrl.url, {
      headers: tokenUrl.headers,
      data: {
        grant_type: 'authorization_code',
        code,
      },
    });

    if (!response.id_token) {
      throw new Error('Missing variable : id_token');
    }

    const jwtToken = response.id_token;

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

    let newUser = false;
    let user = await client.db().collection(COLL_USERS).findOne({
      username,
    });

    const token = Random.secret();
    if (!user) {
      const badges = (
        await client
          .db()
          .collection(COLL_USER_BADGES)
          .find({ appId, isDefault: true })
          .toArray()
      ).map((badge) => ({
        id: badge._id,
        status: 'assigned',
      }));

      newUser = true;
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
            loginTokens: [
              {
                hashedToken: hashLoginToken(token),
                when: new Date(),
              },
            ],
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

      if (avatar) {
        user.profile.avatar = `https://${decodeURIComponent(avatar)}`;
      }

      await client.db().collection(COLL_USERS).insertOne(user);
    } else {
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          {
            _id: user._id,
            appId,
            username,
          },
          {
            $set: {
              'services.oauth.authTime': authTime,
              'services.oauth.avatar': avatar,
              'services.oauth.exp': exp,
              'services.oauth.qrCodeContent': qrCodeContent,
            },
            $addToSet: {
              'services.resume.loginTokens': {
                hashedToken: hashLoginToken(token),
                when: new Date(),
              },
            },
          }
        );
    }

    if (newUser || user.services.oauth.qrCodeContent !== qrCodeContent) {
      await QRCode.toFile('/tmp/avatar.png', qrCodeContent, { width: 256 });

      const fileStats = await fs.promises.stat('/tmp/avatar.png');

      const uploadParams = await callGetUploadUrlLambda(
        user._id,
        appId,
        fileStats.size,
        'avatar.png',
        'image/png'
      );

      await uploadPngHttps(
        fs.createReadStream('/tmp/avatar.png'),
        fileStats.size,
        uploadParams.url
      );

      const avatarUrl = await new Promise((resolve) => {
        const checkAgain = async () => {
          const picture = await client.db().collection(COLL_PICTURES).findOne({
            _id: uploadParams.id,
          });

          if (picture.mediumUrl) resolve(picture.mediumUrl);
          else setTimeout(checkAgain, 500);
        };

        checkAgain();
      });
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          {
            _id: user._id,
            appId,
            username,
          },
          {
            $set: {
              'profile.qrcodeImage': avatarUrl,
              'profile.qrcodeImageId': uploadParams.id,
            },
          }
        );
    }

    const successRetUrl = new URL(SUCCESS_URL);
    successRetUrl.searchParams.append('userId', user._id);
    successRetUrl.searchParams.append('username', user.username);
    successRetUrl.searchParams.append('profileUsername', user.profile.username);
    successRetUrl.searchParams.append('authToken', token);
    successRetUrl.searchParams.append('authType', 'oauth');
    successRetUrl.searchParams.append(
      'autoLoginToken',
      user.services.wordpress && user.services.wordpress.autoLoginToken
    );

    return successRetUrl.toString();
  } finally {
    client.close();
  }
};
