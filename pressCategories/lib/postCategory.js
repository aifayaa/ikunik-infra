import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (userId, appId, name, pathName, color) => {
  /* Check for parameters */
  if (
    typeof name !== 'string'
    || typeof pathName !== 'string'
    || typeof color !== 'string'
  ) {
    throw new Error('bad arguments');
  }

  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

  try {
    /* Request for categories having the same appId */
    const categories = await client.db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .find({
        appIds: { $elemMatch: { $eq: appId } },
      }, { sort: { name: -1 } })
      .toArray();

    /* Check if those categories already have the same pathName and throw an error if so */
    const errors = [];

    categories.forEach((category) => {
      if (category.pathName === pathName) {
        errors.push(`Pathname ${pathName} already exists for appId ${appId}`);
      }
    });

    if (errors.length) throw new Error(`Errors: ${errors.join('\n')}`);

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
