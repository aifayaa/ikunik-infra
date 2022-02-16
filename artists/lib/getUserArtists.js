import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_ARTISTS,
} = mongoCollections;

export default async (profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const artists = await client
      .db()
      .collection(COLL_ARTISTS)
      .find({
        profil_ID: profileId,
        appId,
      }).toArray();
    return artists;
  } finally {
    client.close();
  }
};
