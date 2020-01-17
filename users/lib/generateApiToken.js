import { MongoClient } from 'mongodb';
import generateToken from '../../libs/tokens/generateToken';
import hashToken from '../../libs/tokens/hashToken';

export default async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const token = generateToken();
    const hash = hashToken(token);
    await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
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
