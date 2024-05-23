/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PURCHASABLE_PRODUCT } = mongoCollections;

export const getPurchasableProduct = async (appId, productId) => {
  const query = {
    appId,
    _id: productId,
  };

  const client = await MongoClient.connect();

  try {
    const product = await client
      .db()
      .collection(COLL_PURCHASABLE_PRODUCT)
      .findOne(query, {
        sort: { createdAt: -1 },
      });
    return product;
  } finally {
    client.close();
  }
};
