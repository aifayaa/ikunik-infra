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
    contents = [],
    options: {
      expiresIn,
      appleProductId,
      googleProductId,
    } = {},
    price,
    type,
  },
) => {
  const $set = {};

  if (contents && contents.length) {
    $set.contents = contents;
  }

  if (typeof expiresIn !== 'undefined') {
    $set.options = {
      expiresIn,
    };
  }

  if (typeof appleProductId !== 'undefined') {
    $set.options = {
      appleProductId,
    };
  }

  if (typeof googleProductId !== 'undefined') {
    $set.options = {
      googleProductId,
    };
  }

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
        { _id: productId, appId },
        { $set },
      );

    return { matchedCount, modifiedCount };
  } finally {
    client.close();
  }
};
