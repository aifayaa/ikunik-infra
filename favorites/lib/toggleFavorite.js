import MongoClient from '../../libs/mongoClient'

const {
  MONGO_URL,
  DB_NAME,
  COLL_ARTISTS_FAV,
} = process.env;

export default async (userId, artistId, appId, isFavorite) => {
  const client = await MongoClient.connect();
  const favoriteData = {
    userId,
    artistId,
    isFavorite,
    appIds: [appId],
    date: new Date(),
  };

  try {
    await client
      .db(DB_NAME)
      .collection(COLL_ARTISTS_FAV)
      .update({
        userId,
        artistId,
        appIds: { $elemMatch: { $eq: appId } },
      }, favoriteData, { upsert: true });
    return true;
  } finally {
    client.close();
  }
};
