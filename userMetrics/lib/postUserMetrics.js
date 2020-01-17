import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_USER_METRICS,
} = process.env;

export default async (
  appId,
  userId,
  type,
  contentId,
  contentCollection,
  data = {},
) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;

  try {
    /* Prepare the object to insert in the database */
    const userMetrics = {
      _id: new ObjectID().toString(),
      appIds: [appId],
      userId,
      type,
      contentId,
      contentCollection,
      trashed: false,
      createdAt: new Date(),
      modifiedAt: false,
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
