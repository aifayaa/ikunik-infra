/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const result = await client
      .db()
      .collection(COLL_APPS)
      .deleteOne({ _id: appId });

    if (result.deletedCount === 0) {
      throw new Error('app_not_found');
    }

    return { deleted: true };
  } finally {
    client.close();
  }
};
