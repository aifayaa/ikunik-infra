import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_ARTISTS,
} = process.env;

export default async (profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const artists = await client
      .db(DB_NAME)
      .collection(COLL_ARTISTS)
      .find({
        profil_ID: profileId,
        appIds: { $elemMatch: { $eq: appId } },
      }).toArray();
    return artists;
  } finally {
    client.close();
  }
};
