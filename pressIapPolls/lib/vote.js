/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_IAP_POLLS, COLL_PRESS_IAP_POLLS_VOTES } = mongoCollections;

export default async (iapPollId, appId, userId, deviceId, votes) => {
  const client = await MongoClient.connect();

  try {
    const iapPoll = await client.db().collection(COLL_PRESS_IAP_POLLS).findOne({
      _id: iapPollId,
      appId,
    });

    if (!iapPoll) {
      throw new Error('content_not_found');
    }

    if (iapPoll.requires === 'auth' && !userId) {
      throw new Error('access_forbidden');
    } else if (iapPoll.require === 'none' && !userId && !deviceId) {
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
      .collection(COLL_PRESS_IAP_POLLS_VOTES)
      .findOne({
        appId,
        iapPollId,
        ...deviceUserMatch,
      });

    if (!voted) {
      await client.db().collection(COLL_PRESS_IAP_POLLS_VOTES).insertOne({
        appId,
        iapPollId,
        userId,
        deviceId,
        votes,
      });
    } else if (iapPoll.canUpdate) {
      await client.db().collection(COLL_PRESS_IAP_POLLS_VOTES).updateOne(
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
