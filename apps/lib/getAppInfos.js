import { MongoClient } from 'mongodb';

const { MONGO_URL, DB_NAME, COLL_APPS } = process.env;

export default async (appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
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
