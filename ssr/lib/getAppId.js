import MongoClient from '../../libs/mongoClient';

export default async (appName) => {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_APPS)
      .findOne({ name: appName || process.env.APP_NAME_DEFAULT }, { projection: { _id: 1 } });
    if (!app) throw new Error('app_not_found');
    return app._id;
  } finally {
    client.close();
  }
};
