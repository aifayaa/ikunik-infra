import MongoClient from '../../libs/mongoClient';

const {
  COLL_PURCHASES,
  DB_NAME,
} = process.env;

export const addPurchaseHistory = async ({
  appId,
  bodyParsed,
  productId,
  purchaseData,
  userId,
} = {}) => {
  // JSON.stringify for security reasons ? Avoid document data injection ?
  // Maybe we shouln't store those fields ?
  const insertData = {
    appId,
    request: JSON.stringify(bodyParsed),
    productId,
    response: JSON.stringify(purchaseData),
    userId,
  };

  const client = await MongoClient.connect();

  try {
    await client
      .db(DB_NAME)
      .collection(COLL_PURCHASES)
      .insertOne(insertData);

    return insertData;
  } finally {
    client.close();
  }
};
