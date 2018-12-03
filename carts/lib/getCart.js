import { MongoClient } from 'mongodb';

export default async (cartId, userId, selector) => {
  let client;
  selector._id = cartId;
  selector.userId = userId;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection('carts')
      .findOne(selector);
  } finally {
    client.close();
  }
};
