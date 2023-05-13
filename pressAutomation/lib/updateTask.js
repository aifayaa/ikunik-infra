import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

export default async (adId, appId, userId, toSet) => {
  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .updateOne({
        _id: adId,
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
        _id: adId,
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
