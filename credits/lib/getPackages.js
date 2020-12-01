import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_CREDIT_PACKAGES,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const packages = await client
      .db(DB_NAME)
      .collection(COLL_CREDIT_PACKAGES)
      .find({ appIds: appId })
      .toArray();
    return { packages };
  } finally {
    client.close();
  }
};
