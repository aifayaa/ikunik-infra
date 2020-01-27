import MongoClient from '../../libs/mongoClient';

const { DB_NAME, COLL_APPS } = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db(DB_NAME)
      .collection(COLL_APPS)
      .findOne(
        {
          _id: appId,
        },
        { projection: { name: 1, key: 1 } },
      );

    if (!app) {
      return false;
    }

    const results = {
      name: app.name,
      key: app.key,
    };

    return results;
  } finally {
    client.close();
  }
};
