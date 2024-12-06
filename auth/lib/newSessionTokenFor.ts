/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import hashLoginToken from './hashLoginToken';
import Random from '../../libs/account_utils/random';

const { COLL_USERS } = mongoCollections;

export const newSessionTokenFor = async (userId: string, appId: string) => {
  const client = await MongoClient.connect();
  try {
    const usersCollection = client.db().collection(COLL_USERS);

    let user = await usersCollection.findOne({ appId, _id: userId });
    if (!user) {
      throw new Error('user_not_found');
    }

    const token = Random.secret();
    const hashedToken = hashLoginToken(token);

    await usersCollection.updateOne(
      {
        _id: user._id,
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
