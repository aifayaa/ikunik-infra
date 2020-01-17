import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_FESTIVALS,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const festivals = await client
      .db(DB_NAME)
      .collection(COLL_FESTIVALS)
      .find({ appIds: { $elemMatch: { $eq: appId } } })
      .toArray();
    return festivals;
  } finally {
    client.close();
  }
};
