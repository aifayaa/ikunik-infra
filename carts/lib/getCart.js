import { MongoClient } from 'mongodb';

export default async (cartId, userId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection('carts')
      .findOne({ _id: cartId, userId });
  } finally {
    client.close();
  }
};
