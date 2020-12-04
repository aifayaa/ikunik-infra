import MongoClient, { ObjectID } from '../../libs/mongoClient';
import isAvailable from './isAvailable';

const { COLL_PRESS_CATEGORIES, DB_NAME, SAFE_ORDER_NUMBER } = process.env;

export default async (
  appId,
  name,
  pathName,
  color,
  picture,
  order,
  hidden,
  action,
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const checkAvailability = await isAvailable(client, appId, name, pathName);
    if (checkAvailability !== true) throw new Error(checkAvailability);

    /*
      defaultOrder is the last order
      total number of ordered categories + 1
    */
    const defaultOrder =
      (await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .count({
          appIds: appId,
          /*
            SAFE_ORDER_NUMBER = 999 is used as a safe position for unordered categories
            mongodb sort null values on top, that's why all categories
            should have an order field.
          */
          order: { $ne: SAFE_ORDER_NUMBER },
        })) + 1;

    if (defaultOrder >= SAFE_ORDER_NUMBER) {
      throw new Error('max_category_reached');
    }

    /* Otherwise, insert the category to the database and return it */
    const category = {
      _id: new ObjectID().toString(),
      name,
      pathName,
      color,
      picture: picture.pop(),
      appIds: [appId],
      createdAt: new Date(),
      hidden,
      action,
      // use default if order not valid
      order: Math.min(order || defaultOrder, defaultOrder),
    };

    const bulk = client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .initializeOrderedBulkOp();

    /* ex inserting at 2nd position
       new
        ||
        \/
      [1, 2 , 3, 4, 5]

      all values after position 2 must be increased
      [1, n=>2, 2=>3, 3=>4, 4=>5, 5=>6]
    */
    bulk
      .find({
        appIds: appId,
        order: {
          $gte: category.order,
          $lt: SAFE_ORDER_NUMBER,
        },
      })
      .update({ $inc: { order: 1 } });
    bulk.insert(category);
    await bulk.execute();

    return { _id: category._id, ...category };
  } finally {
    client.close();
  }
};
