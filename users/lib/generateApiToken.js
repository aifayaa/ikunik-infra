import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';

export default async (userId) => {
  const client = await MongoClient.connect();
  try {
    const token = generateToken();
    const hash = hashToken(token);
    await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .updateOne({
        _id: userId,
      }, {
        $addToSet: {
          'services.apiTokens': {
            hashedToken: hash,
            when: new Date(Date.now()).toISOString(),
          },
        },
      });
    return token;
  } finally {
    client.close();
  }
};
