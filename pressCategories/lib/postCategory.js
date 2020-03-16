import MongoClient, { ObjectID } from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, name, pathName, color, picture) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    /* Request for categories having the same appId and name or pathName */
    const queryExists = {
      $or: [{ name }],
      appIds: { $elemMatch: { $eq: appId } },
    };
    if (pathName) queryExists.$or.push({ pathName });
    const categoryFound = await client.db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .findOne(queryExists);

    if (categoryFound) {
      let errorCatFound = `Already exists for appId ${appId}`;
      if (pathName && pathName === categoryFound.pathName) {
        errorCatFound = `Pathname ${pathName}, ${errorCatFound}`;
      }
      if (name === categoryFound.name) {
        errorCatFound = `Name ${name}, ${errorCatFound}`;
      }
      return errorCatFound;
    }

    /* Otherwise, insert the category to the database and return it */
    const category = {
      _id: new ObjectID().toString(),
      name,
      pathName,
      color,
      picture: picture.pop(),
      appIds: [appId],
    };

    const _id = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .insertOne(category);

    return { _id, ...category };
  } finally {
    client.close();
  }
};
