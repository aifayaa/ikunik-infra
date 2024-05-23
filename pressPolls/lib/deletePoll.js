/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_POLLS, COLL_PRESS_POLLS_VOTES } = mongoCollections;

export default async (pollId, appId) => {
  const client = await MongoClient.connect();

  try {
    const pollObj = await client.db().collection(COLL_PRESS_POLLS).findOne({
      _id: pollId,
      appId,
    });

    if (pollObj) {
      await client.db().collection(COLL_PRESS_POLLS).deleteOne({
        _id: pollId,
        appId,
      });

      await client.db().collection(COLL_PRESS_POLLS_VOTES).deleteMany({
        pollId,
        appId,
      });
    } else {
      throw new Error('not_found');
    }

    return pollObj;
  } finally {
    client.close();
  }
};
