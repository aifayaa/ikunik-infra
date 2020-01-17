import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PROJECTS,
} = process.env;

export default async (artistId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const project = await client
      .db(DB_NAME)
      .collection(COLL_PROJECTS)
      .findOne({
        artist_ID: artistId,
        iconeThumbFileUrl: { $exists: true },
        projectIsValidated: true,
        appIds: { $elemMatch: { $eq: appId } },
      }, {
        sort: { createdAt: -1 },
      });
    if (!project) throw new Error('Not Found');
    return { src: project.iconeThumbFileUrl, title: project.projectName };
  } finally {
    client.close();
  }
};
