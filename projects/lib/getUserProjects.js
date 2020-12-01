import MongoClient from '../../libs/mongoClient';

const {
  COLL_PROJECTS,
  DB_NAME,
} = process.env;

export default async (_userId, profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const projects = await client
      .db(DB_NAME)
      .collection(COLL_PROJECTS)
      .find({
        profil_ID: profileId,
        appIds: appId,
      }).toArray();
    return { projects };
  } finally {
    client.close();
  }
};
