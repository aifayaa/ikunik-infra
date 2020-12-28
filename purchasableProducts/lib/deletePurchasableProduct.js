import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PURCHASABLE_PRODUCT,
} = process.env;

export const deletePurchasableProduct = async (
  appId,
  userId,
  productId,
) => {
  const client = await MongoClient.connect();

  try {
    return await client.db(DB_NAME)
      .collection(COLL_PURCHASABLE_PRODUCT)
      .deleteOne({ _id: productId, appId });
  } finally {
    client.close();
  }
};
