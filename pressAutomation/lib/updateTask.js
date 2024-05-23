/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

export default async (taskId, appId, userId, toSet) => {
  const client = await MongoClient.connect();

  try {
    if (toSet.startDateTime)
      toSet.startDateTime = new Date(toSet.startDateTime);
    if (toSet.endDateTime) toSet.endDateTime = new Date(toSet.endDateTime);
    const { customPrompts = {} } = toSet;
    const customPromptsKeys = Object.keys(customPrompts).reduce((acc, key) => {
      acc[`customPrompts.${key}`] = customPrompts[key];
      return acc;
    }, {});
    delete toSet.customPrompts;

    await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .updateOne(
        {
          _id: taskId,
          appId,
        },
        {
          $set: {
            ...toSet,
            ...customPromptsKeys,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        }
      );

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

    return adObj;
  } finally {
    client.close();
  }
};
