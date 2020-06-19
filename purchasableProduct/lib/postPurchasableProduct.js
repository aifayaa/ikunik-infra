import MongoClient, { ObjectID } from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PURCHASABLE_PRODUCT,
} = process.env;

export const postPurchasableProduct = async (
  appId,
  userId,
  {
    _id = new ObjectID().toString(),
    contents = [],
    options: {
      expiresIn = false,
    } = {},
    price,
    type,
  },
) => {
  const purchasableProduct = {
    _id,
    appIds: [appId],
    contents,
    createdAt: new Date(),
    options: {
      expiresIn,
    },
    price,
    type,
  };

  const client = await MongoClient.connect();

  try {
    await client.db(DB_NAME)
      .collection(COLL_PURCHASABLE_PRODUCT)
      .insertOne(purchasableProduct);

    return { productId: purchasableProduct._id };
  } finally {
    client.close();
  }
};
