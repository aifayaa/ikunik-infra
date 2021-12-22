import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ARTISTS_FAV } = mongoCollections;

export default async (userId, artistId, appId) => {
  const client = await MongoClient.connect();

  try {
    const data = await client
      .db()
      .collection(COLL_ARTISTS_FAV)
      .findOne({
        userId,
        artistId,
        appId,
      });
    return data || {};
  } finally {
    client.close();
  }
};
