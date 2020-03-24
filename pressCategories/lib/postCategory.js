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

    /* Otherwise, insert the category to the database and return it */
    const category = {
      _id: new ObjectID().toString(),
      name,
      pathName,
      color,
      picture: picture.pop(),
      appIds: [appId],
      createdAt: new Date(),
      order: order || (await client // get total number of categories
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .count({ appIds: appId })
      ) + 1,
    };

    const bulk = client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .initializeOrderedBulkOp();

    bulk.find({
      appIds: appId,
      order: {
        $gte: category.order,
        $lt: 99,
        $exists: true,
      },
    }).update({ $inc: { order: 1 } });
    bulk.insert(category);
    await bulk.execute();

    return { _id: category._id, ...category };
  } finally {
    client.close();
  }
};
