/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

// Taken from https://stackoverflow.com/a/6969486
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async (appId, { limit = null, search = null, start = null }) => {
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

    const iapPollsList = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .find(query, options)
      .toArray();

    const iapPollsCount = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .find(query)
      .count();

    return { list: iapPollsList, count: iapPollsCount };
  } finally {
    client.close();
  }
};
