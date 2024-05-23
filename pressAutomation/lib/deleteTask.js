/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

export default async (taskId, appId) => {
  const client = await MongoClient.connect();

  try {
    const taskObj = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .findOne({
        _id: taskId,
        appId,
      });

    if (taskObj) {
      await client.db().collection(COLL_PRESS_AUTOMATION_TASKS).deleteOne({
        _id: taskId,
        appId,
      });
    } else {
      throw new Error('not_found');
    }

    return taskObj;
  } finally {
    client.close();
  }
};
