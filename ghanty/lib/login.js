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

const { COLL_APPS, COLL_PICTURES, COLL_USERS, COLL_USER_BADGES } = mongoCollections;

const lambda = new Lambda({
  region: process.env.REGION,
});

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
      res.on('data', () => {});
      res.on('end', resolve);
    });

    req.on('error', reject);
    fileStream.pipe(req);
  });
}

async function callGetUploadUrlLambda(userId, appId, fileSize, fileName, fileType) {
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
    await fidApi.renewLoginTokenIfNeeded(client);
    metricsTimer.print('renewLoginTokenIfNeeded');

    metricsTimer.start();
    const response = await fidApi.checkUser(inputUsername, inputPassword);
    metricsTimer.print('checkUser', { inputUsername });

    await metricsTimer.save(client);

    if (!response.client_id) {
      throw new Error('missing_access_token');
    }

    const {
      client_id: username,
      qrcode: qrCodeContent,
    } = response;

    let newUser = false;
    let user = await client.db().collection(COLL_USERS).findOne({
      username,
    });

    const token = Random.secret();
    if (!user) {
      const badges = (
        await client.db().collection(COLL_USER_BADGES).find({ appId, isDefault: true }).toArray()
      ).map((badge) => ({ id: badge._id }));

      newUser = true;
      user = {
        _id: Random.id(),
        createdAt: new Date(),
        username,
        services: {
          ghantyLogin: {
            loginAt: new Date(),
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
        profile: {},
        badges,
      };

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
              'services.ghantyLogin.loginAt': new Date(),
              'services.ghantyLogin.qrCodeContent': qrCodeContent,
            },
            $addToSet: {
              'services.resume.loginTokens': {
                hashedToken: hashLoginToken(token),
                when: new Date(),
              },
            },
          },
        );
    }

    if (newUser || user.services.ghantyLogin.qrCodeContent !== qrCodeContent) {
      await QRCode.toFile('/tmp/qrcode.png', qrCodeContent, { width: 256 });

      const fileStats = await fs.promises.stat('/tmp/qrcode.png');

      const uploadParams = await callGetUploadUrlLambda(
        user._id,
        appId,
        fileStats.size,
        'qrcode.png',
        'image/png',
      );

      await uploadPngHttps(
        fs.createReadStream('/tmp/qrcode.png'),
        fileStats.size,
        uploadParams.url,
      );

      const qrcodeUrl = await new Promise((resolve) => {
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
              'profile.qrcodeImage': qrcodeUrl,
              'profile.qrcodeImageId': uploadParams.id,
            },
          },
        );
    }

    const ret = {
      userId: user._id,
      username: user.username,
      authToken: token,
      authType: 'myfid',
    };

    return ret;
  } finally {
    client.close();
  }
};
