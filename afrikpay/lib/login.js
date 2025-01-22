/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { AfrikPayApi } from '../../libs/backends/afrikpay';
import Random from '../../libs/account_utils/random.ts';
import hashLoginToken from '../../auth/lib/hashLoginToken.ts';

const { COLL_APPS, COLL_USERS, COLL_USER_BADGES } = mongoCollections;

export default async (inputUsername, inputPassword, appId, { terminalId }) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const afrikPayApi = new AfrikPayApi(app);

    const response = await afrikPayApi.call('/api/login/mobile', {
      method: 'POST',
      basic: Buffer.from(`${inputUsername}:${inputPassword}`, 'utf8').toString(
        'base64'
      ),
      terminalId,
    });

    if (!response.result) {
      throw new Error('missing_access_token');
    }

    const { result: afrikPayToken } = response;

    let user = await client.db().collection(COLL_USERS).findOne({
      username: inputUsername,
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

      user = {
        _id: Random.id(),
        createdAt: new Date(),
        services: {
          afrikpayLogin: {
            loginAt: new Date(),
            lastToken: afrikPayToken,
          },
          resume: {
            loginTokens: [
              {
                afrikPayToken,
                hashedToken: hashLoginToken(token),
                when: new Date(),
              },
            ],
          },
        },
        username: inputUsername,
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
            username: inputUsername,
          },
          {
            $set: {
              'services.afrikpayLogin.loginAt': new Date(),
              'services.afrikpayLogin.lastToken': afrikPayToken,
            },
            $addToSet: {
              'services.resume.loginTokens': {
                hashedToken: hashLoginToken(token),
                afrikPayToken,
                when: new Date(),
              },
            },
          }
        );
    }

    const ret = {
      userId: user._id,
      username: user.username,
      authToken: token,
      authType: 'afrikpay',
      afrikPayToken,
    };

    return ret;
  } finally {
    client.close();
  }
};
