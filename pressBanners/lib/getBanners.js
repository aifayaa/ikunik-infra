/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_BANNERS } = mongoCollections;

export default async function getBanners(appId, tab = null) {
  const client = await MongoClient.connect();

  try {
    const query = { appId };
    if (tab) query.tab = tab;
    const banners = await client
      .db()
      .collection(COLL_PRESS_BANNERS)
      .find(query)
      .toArray();

    return banners;
  } finally {
    client.close();
  }
}
