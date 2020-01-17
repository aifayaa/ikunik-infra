import { MongoClient } from 'mongodb';

const {
  COLL_PROJECTS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (_userId, profileId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const projects = await client
      .db(DB_NAME)
      .collection(COLL_PROJECTS)
      .find({
        profil_ID: profileId,
        appIds: { $elemMatch: { $eq: appId } },
      }).toArray();
    return { projects };
  } finally {
    client.close();
  }
};
