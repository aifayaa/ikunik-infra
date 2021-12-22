import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ARTISTS_FAV } = mongoCollections;

export default async (userId, artistId, appId, isFavorite) => {
  const client = await MongoClient.connect();
  const favoriteData = {
    userId,
    artistId,
    isFavorite,
    appId,
    date: new Date(),
  };

  try {
    await client
      .db()
      .collection(COLL_ARTISTS_FAV)
      .update({
        userId,
        artistId,
        appId,
      }, favoriteData, { upsert: true });
    return true;
  } finally {
    client.close();
  }
};
