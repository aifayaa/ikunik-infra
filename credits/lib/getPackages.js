import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_CREDIT_PACKAGES,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const packages = await client
      .db(DB_NAME)
      .collection(COLL_CREDIT_PACKAGES)
      .find({ appIds: { $elemMatch: { $eq: appId } } })
      .toArray();
    return { packages };
  } finally {
    client.close();
  }
};
