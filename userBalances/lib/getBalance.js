import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_BALANCES,
  DB_NAME,
} = process.env;

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
      .db(DB_NAME)
      .collection(COLL_USER_BALANCES)
      .findOne(query);
  } finally {
    client.close();
  }
};
