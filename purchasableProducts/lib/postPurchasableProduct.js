/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PURCHASABLE_PRODUCT } = mongoCollections;

export const postPurchasableProduct = async (
  appId,
  userId,
  {
    _id = new ObjectID().toString(),
    contents = [],
    options: { expiresIn = false, appleProductId, googleProductId } = {},
    price,
    type,
  }
) => {
  const purchasableProduct = {
    _id,
    appId,
    contents,
    createdAt: new Date(),
    options: {
      expiresIn,
      appleProductId,
      googleProductId,
    },
    price,
    type,
  };

  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_PURCHASABLE_PRODUCT)
      .insertOne(purchasableProduct);

    return { productId: purchasableProduct._id };
  } finally {
    client.close();
  }
};
