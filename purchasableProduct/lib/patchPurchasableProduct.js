import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PURCHASABLE_PRODUCT,
} = process.env;

export const patchPurchasableProduct = async (
  appId,
  userId,
  productId,
  {
    content = [],
    options: {
      expireIn,
    } = {},
    perms: {
      all,
      read,
      write,
    } = {},
    price,
    type,
  },
) => {
  const $set = {};

  if (content && content.length) {
    $set.content = content;
  }

  if (typeof expireIn !== 'undefined') {
    $set.options.expireIn = expireIn;
  }

  [all, read, write].forEach((item) => {
    if (typeof item !== 'undefined') {
      $set.perms[item] = item;
    }
  });

  if (price) {
    $set.price = price;
  }

  if (type) {
    $set.type = type;
  }

  if (!Object.keys($set).length) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const client = await MongoClient.connect();

  try {
    const { matchedCount, modifiedCount } = await client.db(DB_NAME)
      .collection(COLL_PURCHASABLE_PRODUCT)
      .updateOne(
        { _id: productId, appIds: [appId] },
        { $set },
      );

    return { matchedCount, modifiedCount };
  } finally {
    client.close();
  }
};
