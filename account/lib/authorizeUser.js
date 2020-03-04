import MongoClient from '../../libs/mongoClient';
import Random from '../../libs/account_utils/random';
import hashLoginToken from './hashLoginToken';
import isJsonWebToken from './isJsonWebToken';
import verifyToken from './verifyJsonWebToken';

/**
 * Get user id from a token
 * If token is a JWT, we verify it and then create user if is not existing into db
 *
 * @param {string} loginToken
 * @param {string} appId
 * @returns {string} userId
 */
export default async (loginToken, appId) => {
  const client = await MongoClient.connect();
  const isJwt = isJsonWebToken(loginToken);
  const userQuery = {};
  let jwt;
  if (isJwt) {
    jwt = await verifyToken(loginToken, appId);
    userQuery['services.openIdConnect.sub'] = jwt.sub;
  } else {
    const hashedLoginToken = hashLoginToken(loginToken);
    userQuery.$or = [
      { 'services.resume.loginTokens.hashedToken': hashedLoginToken },
      { 'services.apiTokens.hashedToken': hashedLoginToken },
    ];
  }
  try {
    let user = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
      .findOne(
        userQuery,
        { projection: { _id: 1 } },
      );

    if (!user && jwt) {
      /* Create User from token */
      const {
        sub,
        given_name: givenName,
        name,
      } = jwt;
      user = {
        _id: Random.id(),
        createdAt: new Date(),
        profile: {
          username: name || givenName,
        },
        services: {
          openIdConnect: {
            sub,
          },
        },
        appIds: [appId],
      };
      await client
        .db(process.env.DB_NAME)
        .collection(process.env.COLL_USERS)
        .insertOne(user);
    }
    return user._id;
  } finally {
    client.close();
  }
};
