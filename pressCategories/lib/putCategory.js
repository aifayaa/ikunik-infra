import MongoClient from '../../libs/mongoClient';
import isAvailable from './isAvailable';

const { COLL_PRESS_CATEGORIES, DB_NAME, SAFE_ORDER_NUMBER } = process.env;

export default async (
  appId,
  categoryId,
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
    let currentOrder = 999;
    const checkAvailability = await isAvailable(
      client,
      appId,
      name,
      pathName,
      categoryId,
    );
    if (checkAvailability !== true) throw new Error(checkAvailability);

    const category = {
      name,
      pathName,
      hidden,
      action,
    };

    if (color) {
      category.color = color;
    }

    if (picture && picture.length) {
      category.picture = picture.pop();
    }


    if (order) {
      ({ order: currentOrder } = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .findOne(
          {
            _id: categoryId,
            appIds: appId,
          },
          { projection: { order: true } },
        ));

      let defaultOrder = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .count({
          appIds: appId,
          order: { $ne: SAFE_ORDER_NUMBER },
        });

      if (currentOrder === SAFE_ORDER_NUMBER) {
        /* category was previously unordered */
        defaultOrder += 1;
        if (defaultOrder >= SAFE_ORDER_NUMBER) {
          /*
            In case we are trying to move a 999 order category
            and there is already 998 ordered categories
          */
          throw new Error('max_ordered_category_reached');
        }
      }

      category.order = Math.min(order, defaultOrder + 1);
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
        bulk
          .find({
            appIds: appId,
            order: {
              $gt: currentOrder,
              $lte: category.order,
            },
          })
          .update({ $inc: { order: -1 } });
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
        bulk
          .find({
            appIds: appId,
            order: {
              $gte: category.order,
              $lt: currentOrder,
              $ne: SAFE_ORDER_NUMBER,
            },
          })
          .update({ $inc: { order: 1 } });
      }
    }
    bulk
      .find({
        _id: categoryId,
        appIds: appId,
      })
      .updateOne({ $set: category });

    const { nMatched } = await bulk.execute();

    return !!nMatched;
  } finally {
    client.close();
  }
};
