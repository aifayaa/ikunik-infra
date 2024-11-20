/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

export default async (iapPollId, appId, userId, toSet) => {
  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .updateOne(
        {
          _id: iapPollId,
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

    const iapPollObj = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({
        _id: iapPollId,
        appId,
      });

    if (!iapPollObj) {
      throw new Error('content_not_found');
    }

    return iapPollObj;
  } finally {
    client.close();
  }
};
