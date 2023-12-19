import getDBCounters from '../../counters/lib/getDBCounters';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_POLLS,
  COLL_PRESS_POLLS_VOTES,
} = mongoCollections;

// Taken from https://stackoverflow.com/a/6969486
function escapeRegex(str) {
  return (str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

async function fetchPollCounters(poll, { appId, client, deviceId, userId }) {
  const { choices } = poll;

  const queries = choices
    .reduce((acc, choice) => {
      acc[choice] = {
        appId,
        type: `pressPolls-vote-${choice}`,
        name: poll._id,
        updateQuery: {
          collection: COLL_PRESS_POLLS_VOTES,
          pipeline: [
            {
              $match: {
                appId,
                pollId: poll._id,
                votes: choice,
              },
            },
            {
              $count: 'total',
            },
          ],
          outputField: 'total',
        },
      };

      return (acc);
    }, {});

  const ret = {};
  ret.allVotes = await getDBCounters(queries, { appId });

  if (deviceId || userId) {
    const myVotes = await client
      .db()
      .collection(COLL_PRESS_POLLS_VOTES)
      .findOne({
        appId,
        pollId: poll._id,
        $or: [
          { userId },
          { deviceId },
        ],
      });
    if (myVotes) {
      ret.myVotes = myVotes.votes;
    }
  }

  return (ret);
}

export default async (appId, {
  limit = null,
  search = null,
  start = null,
  deviceId = null,
  userId = null,
}, isAdmin) => {
  const client = await MongoClient.connect();

  try {
    const query = {
      appId,
    };
    const options = {
      sort: [['createdAt', -1]],
    };

    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search) } },
        { description: { $regex: escapeRegex(search) } },
      ];
    }

    if (start !== null) options.skip = start;
    if (limit !== null) options.limit = limit;

    const pollsList = await client
      .db()
      .collection(COLL_PRESS_POLLS)
      .find(query, options)
      .toArray();

    const pollsCount = await client
      .db()
      .collection(COLL_PRESS_POLLS)
      .find(query)
      .count();

    if (!isAdmin) {
      const promises = pollsList.map(async (poll, arrayId) => {
        const pollCounters = await fetchPollCounters(poll, { appId, client, deviceId, userId });
        pollsList[arrayId].votes = pollCounters;
      });

      await Promise.all(promises);
    }

    return ({ list: pollsList, count: pollsCount });
  } finally {
    client.close();
  }
};
