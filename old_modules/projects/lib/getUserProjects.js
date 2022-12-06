import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PROJECTS } = mongoCollections;

export default async (_userId, profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const projects = await client
      .db()
      .collection(COLL_PROJECTS)
      .find({
        profil_ID: profileId,
        appId,
      }).toArray();
    return { projects };
  } finally {
    client.close();
  }
};
