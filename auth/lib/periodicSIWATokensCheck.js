/* eslint-disable import/no-relative-packages */
import S3 from 'aws-sdk/clients/s3';
import { JWT, JWK } from 'jose';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { S3_APPS_RESSOURCES_REGION, S3_APPS_RESSOURCES } = process.env;

const { COLL_APPS } = mongoCollections;

const DEFAULTS = {
  payload: {},
  audience: 'https://appleid.apple.com',
  kid: true,
  iat: true,
  delay: 25,
  algorithm: 'ES256',
  validity: 180,
};

async function refreshJwtToken(
  app,
  { payload, audience, iat, algorithm, validity }
) {
  const s3 = new S3({
    region: S3_APPS_RESSOURCES_REGION,
  });
  const s3Path = `${app._id}/ios/AppleSignInKey.p8`;
  let s3KeyResponse;
  try {
    s3KeyResponse = await s3
      .getObject({
        Bucket: S3_APPS_RESSOURCES,
        Key: s3Path,
      })
      .promise();
  } catch (e) {
    throw new Error(`Error fetching S3 key object at path ${s3Path} : ${e}`);
  }

  const siwaKey = s3KeyResponse.Body.toString('utf8');

  const kid = app.credentials.apple.keyId;
  let key;
  try {
    key = JWK.asKey(siwaKey, { alg: algorithm, kid });
  } catch (e) {
    throw new Error(
      `Error parsing/loading key (stored at S3 path ${s3Path}) : ${e}`
    );
  }

  const jwtToken = JWT.sign(payload, key, {
    algorithm,
    audience,
    expiresIn: `${validity}d`,
    iat,
    issuer: app.appleAccounts.teamId,
    kid: true,
    subject: app.builds.ios.packageId,
  });

  const client = await MongoClient.connect();
  try {
    client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: app._id },
        {
          $set: {
            'credentials.apple.clientSecret': jwtToken,
            'credentials.apple.expireTime': parseInt(
              Date.now() / 1000 + validity * 86400,
              10
            ),
          },
        }
      );
  } finally {
    client.close();
  }
}

export const periodicSIWATokensCheck = async () => {
  const client = await MongoClient.connect();

  try {
    const expireMinTime = parseInt(
      Date.now() / 1000 + DEFAULTS.delay * 86400,
      10
    );
    const toExpireApps = await client
      .db()
      .collection(COLL_APPS)
      .find({
        'appleAccounts.teamId': { $exists: true },
        'builds.ios.packageId': { $exists: true },
        'credentials.apple.keyId': { $exists: true },
        $or: [
          { 'credentials.apple.expireTime': null },
          { 'credentials.apple.expireTime': { $lt: expireMinTime } },
        ],
      })
      .toArray();

    if (toExpireApps.length === 0) return [];

    const promises = [];

    toExpireApps.forEach((app) => {
      promises.push(refreshJwtToken(app, DEFAULTS));
    });

    const results = await Promise.allSettled(promises);

    return results.map((result, id) => ({ ...result, app: toExpireApps[id] }));
  } finally {
    client.close();
  }
};
