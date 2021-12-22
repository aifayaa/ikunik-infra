import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (appId, opts) => {
  const client = await MongoClient.connect();
  try {
    const selector = { appId };
    if (opts.type) selector.type = opts.type;
    const packages = await client
      .db()
      .collection(mongoCollections.COLL_TOKEN_PACKAGES)
      .find(selector)
      .toArray();
    return { packages };
  } finally {
    client.close();
  }
};
