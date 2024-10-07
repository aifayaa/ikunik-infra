/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_METRICS } = mongoCollections;

export default async (
  appId,
  { contentCollection, contentId, data = {}, deviceId, type, userId }
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
        if (key === 'startTime' || key === 'endTime') {
          userMetrics[key] = new Date(value);
        } else {
          userMetrics[key] = value;
        }
      }
    });

    /* Insert into database and return id along with object structure */
    const _id = await client
      .db()
      .collection(COLL_USER_METRICS)
      .insertOne(userMetrics);

    return { _id, ...userMetrics };
  } finally {
    client.close();
  }
};
