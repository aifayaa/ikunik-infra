import MongoClient, { ObjectID } from '../../libs/mongoClient';
import isAvailable from './isAvailable';

const {
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, name, pathName, color, picture, order) => {
  /* Mongo client */
  const client = await MongoClient.connect();
  try {
    const checkAvailability = await isAvailable(client, appId, name, pathName);
    if (checkAvailability !== true) throw new Error(checkAvailability);

    const defaultOrder = (await client // get total number of categories with order
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .count({
        appIds: appId,
        order: { $ne: 999 },
      })) + 1;

    /* Otherwise, insert the category to the database and return it */
    const category = {
      _id: new ObjectID().toString(),
      name,
      pathName,
      color,
      picture: picture.pop(),
      appIds: [appId],
      createdAt: new Date(),
      // use last order if order not valid
      order: (!order || (order > defaultOrder)) ? defaultOrder : order,
    };

    const bulk = client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .initializeOrderedBulkOp();

    bulk.find({
      appIds: appId,
      order: {
        $gte: category.order,
        $lt: 999,
      },
    }).update({ $inc: { order: 1 } });
    bulk.insert(category);
    await bulk.execute();

    return { _id: category._id, ...category };
  } finally {
    client.close();
  }
};
