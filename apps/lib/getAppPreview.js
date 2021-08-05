import MongoClient from '../../libs/mongoClient';

const { DB_NAME, COLL_APPS } = process.env;

export default async (previewKey) => {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db(DB_NAME)
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
