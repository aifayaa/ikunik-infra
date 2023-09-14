import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

export default async (appId, userId, {
  action,
  active = true,
  articlesCount,
  autoNotify = true,
  autoPublish = true,
  categories,
  country,
  customPrompts = {},
  endDateTime,
  fetchNewsSince,
  lang = 'en',
  name,
  newsCategory,
  nextArticles = [],
  query,
  recurrence,
  startDateTime,
}) => {
  const client = await MongoClient.connect();

  try {
    const newTaskObj = {
      _id: new ObjectID().toString(),
      appId,
      createdAt: new Date(),
      createdBy: userId,

      action,
      active,
      articlesCount,
      autoNotify,
      autoPublish,
      categories,
      country,
      customPrompts,
      endDateTime: endDateTime ? new Date(endDateTime) : null,
      fetchNewsSince,
      lang,
      name,
      newsCategory,
      nextArticles,
      query,
      recurrence,
      startDateTime: new Date(startDateTime),
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
