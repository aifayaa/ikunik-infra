import MongoClient from '../../libs/mongoClient';

const {
  COLL_PURCHASABLE_PRODUCT,
  DB_NAME,
} = process.env;

export const findPurchasableProduct = async (
  appId,
  {
    contentCollection,
    contentId,
  } = {},
) => {
  const query = {
    appIds: {
      $elemMatch: {
        $eq: appId,
      },
    },
    content: [{
      contentCollection,
      contentId,
    }],
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
