import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (cartId, userId, appId, selector) => {
  let client;
  const { COLL_CARTS } = mongoCollections;
  selector._id = cartId;
  selector.userId = userId;
  selector.appId = appId;
  try {
    client = await MongoClient.connect();
    return await client.db()
      .collection(COLL_CARTS)
      .findOne(selector);
  } finally {
    client.close();
  }
};
