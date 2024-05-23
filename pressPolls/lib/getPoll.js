/* eslint-disable import/no-relative-packages */
import getDBCounters from '../../counters/lib/getDBCounters';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_POLLS, COLL_PRESS_POLLS_VOTES } = mongoCollections;

export async function fetchPollCounters(
  poll,
  { appId, client, deviceId, userId }
) {
  const { options } = poll;

  const queries = options.reduce((acc, choice) => {
    acc[choice.id] = {
      appId,
      type: `pressPolls-vote-${choice.id}`,
      name: poll._id,
      updateQuery: {
        collection: COLL_PRESS_POLLS_VOTES,
        pipeline: [
          {
            $match: {
              appId,
              pollId: poll._id,
              votes: choice.id,
            },
          },
          {
            $count: 'total',
          },
        ],
        outputField: 'total',
      },
    };

    return acc;
  }, {});

  const ret = {};
  ret.allVotes = await getDBCounters(queries, { appId });

  if (deviceId || userId) {
    const deviceUserMatch = {};
    if (deviceId && userId) {
      deviceUserMatch.$or = [{ userId }, { deviceId }];
    } else if (deviceId) {
      deviceUserMatch.deviceId = deviceId;
    } else if (userId) {
      deviceUserMatch.userId = userId;
    }

    const myVotes = await client
      .db()
      .collection(COLL_PRESS_POLLS_VOTES)
      .findOne({
        appId,
        pollId: poll._id,
        ...deviceUserMatch,
      });
    if (myVotes) {
      ret.myVotes = myVotes.votes;
    }
  }

  return ret;
}

export default async (pollId, appId, { userId, deviceId }) => {
  const client = await MongoClient.connect();

  try {
    const poll = await client
      .db()
      .collection(COLL_PRESS_POLLS)
      .findOne({ _id: pollId, appId });

    if (!poll) {
      throw new Error('content_not_found');
    }

    const counters = await fetchPollCounters(poll, {
      appId,
      client,
      deviceId,
      userId,
    });

    return {
      ...poll,
      ...counters,
    };
  } finally {
    client.close();
  }
};
