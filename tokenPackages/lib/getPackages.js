import { MongoClient } from 'mongodb';

export default async (appId, opts) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const selector = { appIds: { $elemMatch: { $eq: appId } } };
    if (opts.type) selector.type = opts.type;
    const packages = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_TOKEN_PACKAGES)
      .find(selector)
      .toArray();
    return { packages };
  } finally {
    client.close();
  }
};
