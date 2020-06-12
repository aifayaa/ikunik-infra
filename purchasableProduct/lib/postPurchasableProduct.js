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
    content = [],
    options: {
      expireIn = false,
    } = {},
    perms: {
      all = false,
      read = false,
      write = false,
    } = {},
    price,
    type,
  },
) => {
  const purchasableProduct = {
    _id,
    appIds: [appId],
    content,
    createdAt: new Date(),
    options: {
      expireIn,
    },
    perms: {
      all,
      read,
      write,
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
