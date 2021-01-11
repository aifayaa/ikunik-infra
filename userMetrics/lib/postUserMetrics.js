import MongoClient, { ObjectID } from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_USER_METRICS,
} = process.env;

export default async (
  appId,
  {
    contentCollection,
    contentId,
    data = {},
    deviceId,
    type,
    userId,
  },
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    /* Prepare the object to insert in the database */
    const userMetrics = {
      _id: ObjectID().toString(),
      appId,
      contentCollection,
      contentId,
      createdAt: new Date(),
      deviceId,
      modifiedAt: false,
      trashed: false,
      type,
      userId,
    };

    /* Append data at the document root */
    Object.entries(data).forEach((item) => {
      const [key, value] = item;
      if (typeof data[key] !== 'undefined' && key !== null) {
        userMetrics[key] = value;
      }
    });

    /* Insert into database and return id along with object structure */
    const _id = await client
      .db(DB_NAME)
      .collection(COLL_USER_METRICS)
      .insertOne(userMetrics);

    return { _id, ...userMetrics };
  } finally {
    client.close();
  }
};
