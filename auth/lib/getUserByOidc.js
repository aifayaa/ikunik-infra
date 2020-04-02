import MongoClient from '../../libs/mongoClient';
import verifyJwt from './verifyJsonWebToken';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';
import Random from '../../libs/account_utils/random';

const {
  DB_NAME,
  COLL_USERS,
} = process.env;

export const getUserByOidc = async (identityToken, appId) => {
  console.log({ identityToken, appId });
  const client = await MongoClient.connect();
  try {
    // TODO: verify identityToken
    const decodedIdToken = await verifyJwt(identityToken, appId, { mongoClient: client });
    console.log('decoded token', decodedIdToken);
    const {
      sub,
      given_name: givenName,
      name,
    } = decodedIdToken;

    const db = client.db(DB_NAME);

    if (!sub) {
      throw new Error('missing_sub');
    }
    /* get user in db */
    const collection = db.collection(COLL_USERS);
    const user = await collection.findOne({
      'services.openIdConnect.sub': sub,
      appIds: appId,
    }, { projection: { _id: true } });
    console.log('user=> ', user);
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
          'services.openIdConnect.sub': sub,
          'services.openIdConnect.idToken': decodedIdToken,
          'profile.username': name || givenName,
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
      userId = Random.id();
      /* create new user */
      const userDoc = {
        _id: userId,
        createdAt: new Date(),
        profile: {
          username: name || givenName,
        },
        services: {
          openIdConnect: {
            sub,
          },
          resume: {
            loginTokens: [{
              hashedToken: hash,
              when: date.toISOString(),
            }],
          },
        },
        appIds: [appId],
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
