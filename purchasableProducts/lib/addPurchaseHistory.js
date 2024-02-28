/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PURCHASES } = mongoCollections;

export const addPurchaseHistory = async ({
  appId,
  bodyParsed,
  deviceId,
  productId,
  purchaseData,
  userId,
} = {}) => {
  // JSON.stringify for security reasons ? Avoid document data injection ?
  // Maybe we shouln't store those fields ?
  const insertData = {
    appId,
    deviceId,
    productId,
    request: JSON.stringify(bodyParsed),
    response: JSON.stringify(purchaseData),
    userId,
  };

  const client = await MongoClient.connect();

  try {
    await client.db().collection(COLL_PURCHASES).insertOne(insertData);

    return insertData;
  } finally {
    client.close();
  }
};
