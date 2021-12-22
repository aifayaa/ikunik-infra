import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PROJECTS,
} = mongoCollections;

export default async (artistId, appId) => {
  const client = await MongoClient.connect();
  try {
    const project = await client
      .db()
      .collection(COLL_PROJECTS)
      .findOne({
        artist_ID: artistId,
        iconeThumbFileUrl: { $exists: true },
        projectIsValidated: true,
        appId,
      }, {
        sort: { createdAt: -1 },
      });
    if (!project) throw new Error('Not Found');
    return { src: project.iconeThumbFileUrl, title: project.projectName };
  } finally {
    client.close();
  }
};
