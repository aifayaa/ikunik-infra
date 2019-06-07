import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, categoryId, name, pathName, color) => {
  /* Check for parameters */
  if (
    typeof categoryId !== 'string'
    || typeof name !== 'string'
    || typeof pathName !== 'string'
    || typeof color !== 'string'
  ) {
    throw new Error('bad arguments');
  }

  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

  try {
    const category = {
      name,
      pathName,
      color,
    };

    const matchedCount = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .updateOne(
        {
          _id: categoryId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        { $set: category },
      );


    return !!matchedCount;
  } finally {
    client.close();
  }
};
