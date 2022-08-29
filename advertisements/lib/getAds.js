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
        query['remaining.clicks'] = { $gt: 0 };
        query['remaining.displays'] = { $gt: 0 };
        query.$and = [
          { $or: [
            { 'limits.notBefore': null },
            { 'limits.notBefore': { $lte: new Date() } },
          ] },
          { $or: [
            { 'limits.notAfter': null },
            { 'limits.notAfter': { $gte: new Date() } },
          ] },
        ];
      } else {
        query.$or = [
          { active: false },
          { 'remaining.clicks': { $gt: 0 } },
          { 'remaining.displays': { $gt: 0 } },
          { 'limits.notBefore': { $gt: new Date() } },
          { 'limits.notAfter': { $lt: new Date() } },
        ];
      }
    }

    const adsList = await client
      .db()
      .collection(COLL_ADVERTISEMENTS)
      .find(query, options)
      .toArray();

    return (adsList);
  } finally {
    client.close();
  }
};
