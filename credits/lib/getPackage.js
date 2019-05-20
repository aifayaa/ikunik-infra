import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_CREDIT_PACKAGES,
} = process.env;

export default async (id, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const creditPackage = await client
      .db(DB_NAME)
      .collection(COLL_CREDIT_PACKAGES)
      .findOne({
        _id: id,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return creditPackage;
  } finally {
    client.close();
  }
};
