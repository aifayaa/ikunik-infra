import MongoClient from '../../libs/mongoClient';

export default async (cartId, userId, appId, selector) => {
  let client;
  const {
    DB_NAME,
    COLL_CARTS,
  } = process.env;
  selector._id = cartId;
  selector.userId = userId;
  selector.appIds = appId;
  try {
    client = await MongoClient.connect();
    return await client.db(DB_NAME)
      .collection(COLL_CARTS)
      .findOne(selector);
  } finally {
    client.close();
  }
};
