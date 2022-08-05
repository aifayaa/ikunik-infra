import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BALANCES } = mongoCollections;

export const setBalance = async (
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
      .db()
      .collection(COLL_USER_BALANCES)
      .findOne(findQuery);

    if (!balance) {
      await client
        .db()
        .collection(COLL_USER_BALANCES)
        .insertOne(insertData);
    } else {
      await client
        .db()
        .collection(COLL_USER_BALANCES)
        .updateOne({ _id: balance._id }, {
          $set: {
            amount,
          },
        });
    }

    return insertData;
  } finally {
    client.close();
  }
};
