/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BALANCES } = mongoCollections;

export const getBalance = async (
  appId,
  userId,
  deviceId,
  { type = 'coin' } = {}
) => {
  const findQuery = {
    appId,
    type,
  };
  if (userId && deviceId) {
    findQuery.$or = [{ userId }, { deviceId, userId: null }];
  } else if (userId) {
    findQuery.userId = userId;
  } else if (deviceId) {
    findQuery.deviceId = deviceId;
    findQuery.userId = null;
  } else {
    throw new Error('missing_userid_and_deviceid');
  }

  const client = await MongoClient.connect();

  try {
    return await client.db().collection(COLL_USER_BALANCES).findOne(findQuery);
  } finally {
    client.close();
  }
};
