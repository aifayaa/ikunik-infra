/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ADVERTISEMENTS } = mongoCollections;

export default async (adId, appId) => {
  const client = await MongoClient.connect();

  try {
    const adObj = await client.db().collection(COLL_ADVERTISEMENTS).findOne({
      _id: adId,
      appId,
    });

    if (adObj) {
      await client.db().collection(COLL_ADVERTISEMENTS).deleteOne({
        _id: adId,
        appId,
      });
    } else {
      throw new Error('not_found');
    }

    return adObj;
  } finally {
    client.close();
  }
};
