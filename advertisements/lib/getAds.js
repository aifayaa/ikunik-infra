import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ADVERTISEMENTS } = mongoCollections;

export default async (appId, {
  active = null,
  campaignId = null,
  isActiveNow = null,
  limit = null,
  location = null,
  start = null,
}) => {
  const client = await MongoClient.connect();

  try {
    const query = {
      appId,
    };
    const options = {
      sort: [['createdAt', 1]],
    };

    if (active !== null) query.active = active;
    if (campaignId !== null) query.campaignId = campaignId;
    if (location !== null) query.location = location;

    if (start !== null) options.skip = start;
    if (limit !== null) options.limit = limit;

    if (isActiveNow !== null) {
      if (isActiveNow) {
        query.active = true;
        query['limits.notAfter'] = { $gt: new Date() };
        query['limits.notBefore'] = { $lt: new Date() };
        query['remaining.clicks'] = { $gt: 0 };
        query['remaining.displays'] = { $gt: 0 };
      } else {
        query.$or = [
          { active: false },
          { 'limits.notAfter': { $lte: new Date() } },
          { 'limits.notBefore': { $gte: new Date() } },
          { 'remaining.clicks': { $gt: 0 } },
          { 'remaining.displays': { $gt: 0 } },
        ];
      }
    }

    const adsList = await client
      .db()
      .collection(COLL_ADVERTISEMENTS)
      .find(query, options)
      .toArray();

    const adsCount = await client
      .db()
      .collection(COLL_ADVERTISEMENTS)
      .find(query)
      .count();

    return ({ list: adsList, count: adsCount });
  } finally {
    client.close();
  }
};
