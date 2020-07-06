import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_BALANCES,
  DB_NAME,
} = process.env;

export const addBalance = async (
  appId,
  userId,
  amount,
  {
    type = 'coin',
  } = {},
) => {
  const findQuery = {
    appId,
    type,
    userId,
  };
  const insertData = {
    amount,
    appId,
    type,
    userId,
  };

  const client = await MongoClient.connect();

  try {
    const balance = await client
      .db(DB_NAME)
      .collection(COLL_USER_BALANCES)
      .findOne(findQuery);

    if (!balance) {
      await client
        .db(DB_NAME)
        .collection(COLL_USER_BALANCES)
        .insertOne(insertData);
    } else {
      await client
        .db(DB_NAME)
        .collection(COLL_USER_BALANCES)
        .updateOne(findQuery, {
          $set: {
            amount: ((balance.amount || 0) + amount),
          },
        });
    }

    return insertData;
  } finally {
    client.close();
  }
};
