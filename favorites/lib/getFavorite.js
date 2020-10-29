import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_ARTISTS_FAV,
} = process.env;

export default async (userId, artistId, appId) => {
  const client = await MongoClient.connect();

  try {
    const data = await client
      .db(DB_NAME)
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
