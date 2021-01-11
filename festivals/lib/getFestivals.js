import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_FESTIVALS,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const festivals = await client
      .db(DB_NAME)
      .collection(COLL_FESTIVALS)
      .find({ appId })
      .toArray();
    return festivals;
  } finally {
    client.close();
  }
};
