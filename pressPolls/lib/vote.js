/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_POLLS, COLL_PRESS_POLLS_VOTES } = mongoCollections;

export default async (pollId, appId, userId, deviceId, votes) => {
  const client = await MongoClient.connect();

  try {
    const poll = await client.db().collection(COLL_PRESS_POLLS).findOne({
      _id: pollId,
      appId,
    });

    if (!poll) {
      throw new Error('content_not_found');
    }

    if (poll.requires === 'auth' && !userId) {
      throw new Error('access_forbidden');
    } else if (poll.require === 'none' && !userId && !deviceId) {
      throw new Error('access_forbidden');
    }

    const deviceUserMatch = {};
    if (deviceId && userId) {
      deviceUserMatch.$or = [{ userId }, { deviceId }];
    } else if (deviceId) {
      deviceUserMatch.deviceId = deviceId;
    } else if (userId) {
      deviceUserMatch.userId = userId;
    }

    const voted = await client
      .db()
      .collection(COLL_PRESS_POLLS_VOTES)
      .findOne({
        appId,
        pollId,
        ...deviceUserMatch,
      });

    if (!voted) {
      await client.db().collection(COLL_PRESS_POLLS_VOTES).insertOne({
        appId,
        pollId,
        userId,
        deviceId,
        votes,
      });
    } else if (poll.canUpdate) {
      await client.db().collection(COLL_PRESS_POLLS_VOTES).updateOne(
        {
          _id: voted._id,
        },
        {
          $set: {
            userId,
            deviceId,
            votes,
          },
        }
      );
    } else {
      return false;
    }

    return true;
  } finally {
    client.close();
  }
};
