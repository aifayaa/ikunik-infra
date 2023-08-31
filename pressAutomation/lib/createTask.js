import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

export default async (appId, userId, {
  name,
  query,
  startDateTime,
  endDateTime,
  categories,
  newsCategory,
  country,
  action,
  articlesCount,
  autoPublish = true,
  autoNotify = true,
  recurrence,
  lang = 'en',
  active = true,
}) => {
  const client = await MongoClient.connect();

  try {
    const newTaskObj = {
      _id: new ObjectID().toString(),
      appId,
      createdAt: new Date(),
      createdBy: userId,

      name,
      query,
      startDateTime: new Date(startDateTime),
      endDateTime: endDateTime ? new Date(endDateTime) : null,
      categories,
      newsCategory,
      country,
      action,
      articlesCount,
      autoPublish,
      autoNotify,
      recurrence,
      lang,
      active,
    };

    await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .insertOne(newTaskObj);

    return (newTaskObj);
  } finally {
    client.close();
  }
};
