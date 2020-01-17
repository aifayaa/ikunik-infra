import get from 'lodash/get';
import jwt from 'jsonwebtoken';
import request from 'request-promise-native';
import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';

const {
  DB_NAME,
  COLL_APPS,
  COLL_USERS,
} = process.env;

export const getUserByApple = async (authorizationCode, _identityToken, appId, {
  fullName,
} = {}) => {
  // TODO:verify identityToken => https://developer.apple.com/documentation/signinwithapplerestapi/verifying_a_user

  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const db = client.db(DB_NAME);
    const app = await db.collection(COLL_APPS).findOne({
      _id: appId,
    }, { projection: { 'credentials.apple': true, 'builds.packageId': true } });

    const { clientId, clientSecret } = get(app, 'credentials.apple');
    if (!clientId || !clientSecret) {
      throw new Error('missing_credentials');
    }

    // verify token given by client
    const verified = JSON.parse(await request({
      method: 'POST',
      uri: 'https://appleid.apple.com/auth/token',
      form: {
        grant_type: 'authorization_code',
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
      },
    }));

    const {
      access_token: accessToken,
      token_type: tokenType,
      refresh_token: refreshToken,
      id_token: idToken,
    } = verified;
    const {
      iss, /* should always be "https://appleid.apple.com" */
      aud, /* client_id => same as packageId */
      exp, /* expire at */
      /* iat, */
      sub, /* userId */
      /* at_hash, */
      email,
      /* email_verified, */
      /* auth_time, */
    } = jwt.decode(idToken);

    if (iss !== 'https://appleid.apple.com') {
      throw new Error('unexpected_iss');
    }
    /* check if a build is defined with packageId specified */
    if (app.builds.map(build => build.packageId).indexOf(aud) === -1) {
      throw new Error('unexpected_aud');
    }

    /* get user in db */
    const collection = db.collection(COLL_USERS);
    const user = await collection.findOne({
      'services.apple.userId': sub,
      appIds: { $elemMatch: { $eq: appId } },
    }, { projection: { _id: true } });
    const token = generateToken();
    const hash = hashToken(token);
    const date = new Date();

    let userId;
    /* if user exist, update apple service */
    if (user) {
      userId = user._id;
      /* update accessToken and generate loginToken */
      const patch = {
        $set: {
          'services.apple.expiresAt': exp,
          'services.apple.accessToken': accessToken,
          'services.apple.tokenType': tokenType,
          'services.apple.refreshToken': refreshToken,
          'services.apple.idToken': idToken,
        },
        $addToSet: {
          'services.resume.loginTokens': {
            hashedToken: hash,
            when: date.toISOString(),
          },
          appIds: appId,
        },
      };
      await collection.updateOne({ _id: userId }, patch);
    } else {
      /* create new user */
      const profile = {
        username: fullName.nickname
          || (fullName.givenName || fullName.familyName) ? `${fullName.givenName} ${fullName.familyName}` : email.split('@')[0],
      };

      userId = uuidv4();
      const userDoc = {
        _id: userId,
        createdAt: date,
        profile,
        appIds: [appId],
        services: {
          apple: {
            userId: sub,
            expiresAt: exp,
            accessToken,
            tokenType,
            refreshToken,
            idToken,
          },
          resume: {
            loginTokens: [{
              hashedToken: hash,
              when: date.toISOString(),
            }],
          },
        },
      };
      await collection.insertOne(userDoc);
    }
    return {
      userId,
      authToken: token,
    };
  } finally {
    client.close();
  }
};
