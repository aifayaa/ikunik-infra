import jwt from 'jsonwebtoken';
import Lambda from 'aws-sdk/clients/lambda';
import fs from 'fs';
import https from 'https';
import QRCode from 'qrcode';

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import Random from '../../libs/account_utils/random';
import MetricsTimer from './metricsTimer';
import hashLoginToken from '../../auth/lib/hashLoginToken';

const {
  COLL_APPS,
  COLL_PICTURES,
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

const lambda = new Lambda({
  region: process.env.REGION,
});

function uploadPngHttps(fileStream, fileSize, url) {
  return (new Promise((resolve, reject) => {
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': fileSize,
      },
    };
    const req = https.request(url, options, (res) => {
      res.on('error', reject);
      res.on('data', () => {});
      res.on('end', resolve);
    });

    req.on('error', reject);
    fileStream.pipe(req);
  }));
}

async function callGetUploadUrlLambda(userId, appId, fileSize, fileName, fileType) {
  const lambdaResponse = await lambda.invoke({
    FunctionName: `files-${process.env.STAGE}-getUploadUrl`,
    Payload: JSON.stringify({
      requestContext: {
        authorizer: {
          appId,
          principalId: userId,
        },
      },
      body: JSON.stringify({
        files: [{
          name: fileName,
          type: fileType,
          size: fileSize,
        }],
        metadata: {},
      }),
    }),
  }).promise();

  const { Payload } = lambdaResponse;
  const { statusCode, body } = JSON.parse(Payload);
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Media upload URL generation error : ${body}`);
  }
  const [{ id, url }] = JSON.parse(body);
  return ({ id, url });
}

export default async (inputUsername, inputPassword, appId) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const fidApi = new MyFidApi(app);

    metricsTimer.start();
    const response = await fidApi.userLogin(inputUsername, inputPassword);
    metricsTimer.print('login', { inputUsername });

    await metricsTimer.save(client);

    const jwtToken = response.access_token;

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

      if (avatar) {
        user.profile.avatar = `https://${decodeURIComponent(avatar)}`;
      }

      await client.db().collection(COLL_USERS).insertOne(user);
    } else {
      await client.db().collection(COLL_USERS).updateOne({
        _id: user._id,
        appId,
        username,
      }, {
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
      });
    }

    if (newUser || user.services.oauth.qrCodeContent !== qrCodeContent) {
      await QRCode.toFile(
        '/tmp/avatar.png',
        qrCodeContent,
        { width: 256 },
      );

      const fileStats = await fs.promises.stat('/tmp/avatar.png');

      const uploadParams = await callGetUploadUrlLambda(user._id, appId, fileStats.size, 'avatar.png', 'image/png');

      await uploadPngHttps(fs.createReadStream('/tmp/avatar.png'), fileStats.size, uploadParams.url);

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
      await client.db().collection(COLL_USERS).updateOne({
        _id: user._id,
        appId,
        username,
      }, {
        $set: {
          'profile.qrcodeImage': avatarUrl,
          'profile.qrcodeImageId': uploadParams.id,
        },
      });
    }

    const ret = {
      userId: user._id,
      username: user.username,
      authToken: token,
      authType: 'oauth',
      autoLoginToken: (
        user.services.wordpress &&
        user.services.wordpress.autoLoginToken
      ),
    };

    return (ret);
  } finally {
    client.close();
  }
};
