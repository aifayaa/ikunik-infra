import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BALANCES } = mongoCollections;

export const addBalance = async (
  appId,
  userId,
  deviceId,
  amount,
  {
    type = 'coin',
  } = {},
) => {
  const findQuery = {
    appId,
    type,
  };
  const insertData = {
    amount,
    appId,
    type,
    userId,
    deviceId,
  };
  if (userId && deviceId) {
    findQuery.$or = [
      { userId },
      { deviceId },
    ];
  } else if (userId) {
    findQuery.userId = userId;
  } else if (deviceId) {
    findQuery.deviceId = deviceId;
  } else {
    throw new Error('missing_userid_and_deviceid');
  }

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
            amount: ((balance.amount || 0) + amount),
          },
        });
    }

    return insertData;
  } finally {
    client.close();
  }
};
