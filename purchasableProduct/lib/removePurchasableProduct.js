import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PURCHASABLE_PRODUCT,
} = process.env;

export const postPurchasableProduct = async (
  appId,
  userId,
  productId,
) => {
  const client = await MongoClient.connect();

  try {
    return await client.db(DB_NAME)
      .collection(COLL_PURCHASABLE_PRODUCT)
      .removeOne({ _id: productId });
  } finally {
    client.close();
  }
};
