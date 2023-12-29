import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BALANCES } = mongoCollections;

export const getBalance = async (
  appId,
  userId,
  deviceId,
  {
    type = 'coin',
  } = {},
) => {
  const query = {
    appId,
    type,
  };
  if (userId && deviceId) {
    query.$or = [
      { userId },
      { deviceId },
    ];
  } else if (userId) {
    query.userId = userId;
  } else if (deviceId) {
    query.deviceId = deviceId;
  } else {
    throw new Error('missing_userid_and_deviceid');
  }

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
