import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BALANCES } = mongoCollections;

export const getBalance = async (
  appId,
  userId,
  {
    type = 'coin',
  } = {},
) => {
  const query = {
    appId,
    type,
    userId,
  };

  const client = await MongoClient.connect();

  try {
    return await client
      .db()
      .collection(COLL_USER_BALANCES)
      .findOne(query);
  } finally {
    client.close();
  }
};
