/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_POLLS } = mongoCollections;

export default async (pollId, appId, userId, toSet) => {
  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_PRESS_POLLS)
      .updateOne(
        {
          _id: pollId,
          appId,
        },
        {
          $set: {
            ...toSet,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        }
      );

    const pollObj = await client.db().collection(COLL_PRESS_POLLS).findOne({
      _id: pollId,
      appId,
    });

    if (!pollObj) {
      throw new Error('content_not_found');
    }

    return pollObj;
  } finally {
    client.close();
  }
};
