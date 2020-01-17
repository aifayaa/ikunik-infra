import { MongoClient } from 'mongodb';

export default async (cartId, userId, appId, selector, options) => {
  let client;
  const {
    MONGO_URL,
    DB_NAME,
    COLL_CARTS,
  } = process.env;
  selector._id = cartId;
  selector.userId = userId;
  selector.appIds = { $elemMatch: { $eq: appId } };
  try {
    client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
    return await client.db(DB_NAME)
      .collection(COLL_CARTS)
      .findOneAndUpdate(
        selector,
        {
          $set: {
            status: 'validated',
            appIds: [appId],
          },
        },
        options,
      );
  } finally {
    client.close();
  }
};
