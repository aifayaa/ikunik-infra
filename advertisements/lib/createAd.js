import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ADVERTISEMENTS } = mongoCollections;

export default async (appId, userId, {
  campaignId = null,
  media,
  mediaType,
  url,
  location = 'article',
  locationOpts = '',
  limits: {
    maxDisplays = 0,
    maxClicks = 0,
    notBefore,
    notAfter,
  } = {},
  counters: {
    displays = 0,
    clicks = 0,
  } = {},
  active = true,
}) => {
  const client = await MongoClient.connect();

  try {
    const newAdObj = {
      _id: new ObjectID().toString(),
      appId,
      createdAt: new Date(),
      createdBy: userId,

      campaignId,
      media,
      mediaType,
      url,
      location,
      locationOpts,
      limits: {
        maxDisplays,
        maxClicks,
        notBefore: new Date(notBefore),
        notAfter: new Date(notAfter),
      },
      counters: {
        displays,
        clicks,
      },
      remaining: {
        displays: maxDisplays || Infinity,
        clicks: maxClicks || Infinity,
      },
      active,
    };

    await client
      .db()
      .collection(COLL_ADVERTISEMENTS)
      .insertOne(newAdObj);

    return (newAdObj);
  } finally {
    client.close();
  }
};
