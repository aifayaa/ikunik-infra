/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ADVERTISEMENTS } = mongoCollections;

export default async (adId, appId, what) => {
  const client = await MongoClient.connect();

  try {
    if (what === 'click') {
      await client
        .db()
        .collection(COLL_ADVERTISEMENTS)
        .updateOne(
          {
            _id: adId,
            appId,
            'remaining.clicks': { $gt: 0 },
          },
          {
            $inc: {
              'remaining.clicks': -1,
              'counters.clicks': 1,
            },
          }
        );
    } else if (what === 'display') {
      await client
        .db()
        .collection(COLL_ADVERTISEMENTS)
        .updateOne(
          {
            _id: adId,
            appId,
            'remaining.displays': { $gt: 0 },
          },
          {
            $inc: {
              'remaining.displays': -1,
              'counters.displays': 1,
            },
          }
        );
    }
  } finally {
    client.close();
  }
};
