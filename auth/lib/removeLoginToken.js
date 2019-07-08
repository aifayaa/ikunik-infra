import { MongoClient } from 'mongodb';
import hashToken from '../../libs/tokens/hashToken';

const { DB_NAME, COLL_USERS } = process.env;

export default async (userId, token) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });
  try {
    const hash = hashToken(token);
    const collection = await client.db(DB_NAME).collection(COLL_USERS);
    const { modifiedCount } = await collection.updateOne(
      { _id: userId },
      {
        $pull: {
          'services.resume.loginTokens': { hashedToken: hash },
        },
      },
    );
    if (!modifiedCount) {
      throw new Error('token_user_not_found');
    }
  } finally {
    client.close();
  }
};
