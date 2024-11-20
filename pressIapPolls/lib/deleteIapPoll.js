/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_IAP_POLLS, COLL_PRESS_IAP_POLLS_VOTES } = mongoCollections;

export default async (iapPollId, appId) => {
  const client = await MongoClient.connect();

  try {
    const iapPollObj = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({
        _id: iapPollId,
        appId,
      });

    if (iapPollObj) {
      await client.db().collection(COLL_PRESS_IAP_POLLS).deleteOne({
        _id: iapPollId,
        appId,
      });

      await client.db().collection(COLL_PRESS_IAP_POLLS_VOTES).deleteMany({
        iapPollId,
        appId,
      });
    } else {
      throw new Error('not_found');
    }

    return iapPollObj;
  } finally {
    client.close();
  }
};
