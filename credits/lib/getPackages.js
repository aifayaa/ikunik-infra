import MongoClient from '../../libs/mongoClient'

const {
  MONGO_URL,
  DB_NAME,
  COLL_CREDIT_PACKAGES,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();
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
