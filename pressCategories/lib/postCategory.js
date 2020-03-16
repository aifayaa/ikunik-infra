import MongoClient, { ObjectID } from '../../libs/mongoClient';
import isAvailable from './isAvailable';

const {
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, name, pathName, color, picture) => {
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
