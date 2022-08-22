import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ADVERTISEMENTS } = mongoCollections;

export default async (appId, { _id, campaignId }) => {
  const client = await MongoClient.connect();

  try {
    const ret = {
      displays: 0,
      clicks: 0,
    };

    const query = {
      appId,
    };

    if (_id) query._id = _id;
    if (campaignId) query.campaignId = campaignId;

    const cursor = await client
      .db()
      .collection(COLL_ADVERTISEMENTS)
      .find(query);

    await cursor.forEach((ad) => {
      ret.displays += ad.counters.displays;
      ret.clicks += ad.counters.clicks;
    });

    return (ret);
  } finally {
    client.close();
  }
};
