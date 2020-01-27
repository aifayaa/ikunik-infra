import MongoClient from '../../libs/mongoClient';

const {
  APP_NAME_DEFAULT,
  COLL_APPS,
  DB_NAME,
} = process.env;

export default async (appName) => {
  const client = await MongoClient.connect();
  const name = appName || APP_NAME_DEFAULT;

  try {
    const app = await client
      .db(DB_NAME)
      .collection(COLL_APPS)
      .findOne({ name }, { projection: { _id: 1 } });
    if (!app) {
      throw new Error('app_not_found');
    }
    return app._id;
  } finally {
    client.close();
  }
};
