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
      const defaultOrder = (await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .count({
          appIds: appId,
          /*
            999 is used as a safe position for unordered categories
            mongodb sort null values on top, that's why all categories
            should had a order field.
          */
          order: { $ne: 999 },
        })) + 1;

      category.order = order > defaultOrder ? defaultOrder : order;
      ({ order: currentOrder } = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .findOne({
          _id: categoryId,
          appIds: appId,
        }, { projection: { order: true } }));

      /*
        in case we are trying to move a 999 order category
        and there is already 998 ordered categories
      */
      if (currentOrder === 999 && defaultOrder >= 999) {
        throw new Error('max_ordered_category_reached');
      }
    }

    const bulk = client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .initializeOrderedBulkOp();

    if (order) {
      if (category.order > currentOrder) {
        /* ex move 4 to position 2
             ________
            |        |
            \/       |
          [1, 2 , 3, 4, 5]

          all values between old position and new position must be increased
          [1, 4=>2, 2=>3, 3=>4, 5]
        */
        bulk.find({
          appIds: appId,
          order: {
            $gt: currentOrder,
            $lte: category.order,
          },
        }).update({ $inc: { order: -1 } });
      }
      if (category.order < currentOrder) {
        /* ex move 2 to position 4
               _______
              |       |
              |       \/
          [1, 2 , 3, 4, 5]

          all values between old position and new position must be decreased
          [1, 3=>2, 4=>3, 2=>4, 5]
        */
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
