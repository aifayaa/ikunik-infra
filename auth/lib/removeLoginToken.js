/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import hashToken from '../../libs/tokens/hashToken';

const { COLL_USERS } = mongoCollections;

export const removeLoginToken = async (userId, token) => {
  const client = await MongoClient.connect();
  try {
    const hash = hashToken(token);
    const collection = await client.db().collection(COLL_USERS);
    const { modifiedCount } = await collection.updateOne(
      { _id: userId },
      {
        $pull: {
          'services.resume.loginTokens': { hashedToken: hash },
        },
      }
    );
    if (!modifiedCount) {
      throw new Error('token_user_not_found');
    }
  } finally {
    client.close();
  }
};
