import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

export default async (taskId, appId, userId, toSet) => {
  const client = await MongoClient.connect();

  try {
    if (toSet.startDateTime) toSet.startDateTime = new Date(toSet.startDateTime);
    if (toSet.endDateTime) toSet.endDateTime = new Date(toSet.endDateTime);

    await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .updateOne({
        _id: taskId,
        appId,
      }, { $set: {
        ...toSet,
        updatedAt: new Date(),
        updatedBy: userId,
      } });

    const adObj = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .findOne({
        _id: taskId,
        appId,
      });

    if (!adObj) {
      throw new Error('content_not_found');
    }

    return (adObj);
  } finally {
    client.close();
  }
};
