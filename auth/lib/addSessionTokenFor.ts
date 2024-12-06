/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import hashLoginToken from './hashLoginToken';
import Random from '../../libs/account_utils/random';

const { COLL_USERS } = mongoCollections;

export const addSessionTokenFor = async (
  userId: string,
  appId: string,
  token: string = Random.secret()
) => {
  const client = await MongoClient.connect();
  try {
    const usersCollection = client.db().collection(COLL_USERS);

    const hashedToken = hashLoginToken(token);

    await usersCollection.updateOne(
      {
        _id: userId,
        appId,
      },
      {
        $addToSet: {
          'services.resume.loginTokens': {
            hashedToken,
            when: new Date(),
          },
        },
      }
    );

    return token;
  } finally {
    client.close();
  }
};
