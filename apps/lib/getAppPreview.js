import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (previewKey) => {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        {
          'settings.previewKey': previewKey,
        },
        { projection: {
          key: 1,
          name: 1,
          protocol: 1,
        } },
      );

    if (!app) {
      return false;
    }

    return app;
  } finally {
    client.close();
  }
};
