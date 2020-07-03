import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_BALANCES,
  DB_NAME,
} = process.env;

export const addCurrency = async (
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
    const currency = await client
      .db(DB_NAME)
      .collection(COLL_USER_BALANCES)
      .findOne(findQuery);

    if (!currency) {
      await client
        .db(DB_NAME)
        .collection(COLL_USER_BALANCES)
        .insertOne(insertData);
    } else {
      await client
        .db(DB_NAME)
        .collection(COLL_USER_BALANCES)
        .updateOne(findQuery, {
          currency: currency.amount += amount,
        });
    }

    return insertData;
  } finally {
    client.close();
  }
};
