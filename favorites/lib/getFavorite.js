import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_ARTISTS_FAV,
} = process.env;

export default async (userId, artistId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;

  try {
    const data = await client
      .db(DB_NAME)
      .collection(COLL_ARTISTS_FAV)
      .findOne({
        userId,
        artistId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return data || {};
  } finally {
    client.close();
  }
};
