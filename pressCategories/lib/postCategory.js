import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, name, pathName, color) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

  try {
    /* Request for categories having the same appId */
    const categoryFound = await client.db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .findOne({
        pathName: { $elemMatch: { $eq: pathName } },
        appIds: { $elemMatch: { $eq: appId } },
      });

    if (categoryFound) {
      return `Pathname ${pathName} already exists for appId ${appId}`;
    }

    /* Otherwise, insert the category to the database and return it */
    const category = {
      _id: new ObjectID().toString(),
      name,
      pathName,
      color,
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
