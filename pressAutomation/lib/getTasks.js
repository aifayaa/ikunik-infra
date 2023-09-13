import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

export default async (appId, {
  active = null,
  limit = null,
  start = null,
}) => {
  const client = await MongoClient.connect();

  try {
    const query = {
      appId,
    };
    const options = {
      sort: [['createdAt', -1]],
    };

    if (active !== null) query.active = active;

    if (start !== null) options.skip = start;
    if (limit !== null) options.limit = limit;

    const tasksList = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .find(query, options)
      .toArray();

    const tasksCount = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .find(query)
      .count();

    return ({ list: tasksList, count: tasksCount });
  } finally {
    client.close();
  }
};
