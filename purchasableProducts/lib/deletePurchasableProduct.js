/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PURCHASABLE_PRODUCT } = mongoCollections;

export const deletePurchasableProduct = async (appId, userId, productId) => {
  const client = await MongoClient.connect();

  try {
    return await client
      .db()
      .collection(COLL_PURCHASABLE_PRODUCT)
      .deleteOne({ _id: productId, appId });
  } finally {
    client.close();
  }
};
