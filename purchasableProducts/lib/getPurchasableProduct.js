import MongoClient from '../../libs/mongoClient';

const {
  COLL_PURCHASABLE_PRODUCT,
  DB_NAME,
} = process.env;

export const getPurchasableProduct = async (
  appId,
  productId,
) => {
  const query = {
    appId,
    _id: productId,
  };

  const client = await MongoClient.connect();

  try {
    const product = await client
      .db(DB_NAME)
      .collection(COLL_PURCHASABLE_PRODUCT)
      .findOne(query, {
        sort: { createdAt: -1 },
      });
    return product;
  } finally {
    client.close();
  }
};
