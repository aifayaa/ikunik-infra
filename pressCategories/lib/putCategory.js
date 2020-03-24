import MongoClient from '../../libs/mongoClient';
import isAvailable from './isAvailable';

const {
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, categoryId, name, pathName, color, picture, order) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    let currentOrder = 999;
    const checkAvailability = await isAvailable(client, appId, name, pathName, categoryId);
    if (checkAvailability !== true) throw new Error(checkAvailability);

    const category = {
      name,
      pathName,
    };

    if (color) {
      category.color = color;
    }

    if (picture && picture.length) {
      category.picture = picture.pop();
    }

    if (order) {
      category.order = order;
      ({ order: currentOrder } = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .findOne({
          _id: categoryId,
          appIds: appId,
        }, { projection: { order: true } }));
    }

    const bulk = client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .initializeOrderedBulkOp();

    if (order) {
      if (category.order > currentOrder) {
        bulk.find({
          appIds: appId,
          order: {
            $gt: currentOrder,
            $lte: category.order,
          },
        }).update({ $inc: { order: -1 } });
      }
      if (category.order < currentOrder) {
        bulk.find({
          appIds: appId,
          order: {
            $gte: category.order,
            $lt: currentOrder,
            $ne: 999,
          },
        }).update({ $inc: { order: 1 } });
      }
    }
    bulk.find({
      _id: categoryId,
      appIds: { $elemMatch: { $eq: appId } },
    }).updateOne({ $set: category });

    const { nMatched } = await bulk.execute();

    return !!nMatched;
  } finally {
    client.close();
  }
};
