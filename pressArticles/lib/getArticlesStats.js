/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_ARTICLES } = mongoCollections;

export default async (appId) => {
  let client;
  try {
    client = await MongoClient.connect();

    const articlesColl = client.db().collection(COLL_PRESS_ARTICLES);

    const [published, unpublished, drafts] = await Promise.all([
      articlesColl
        .find({
          appId,
          isPublished: true,
          $or: [
            { unpublicationDate: null },
            { unpublicationDate: { $gt: new Date() } },
          ],
        })
        .count(),
      articlesColl
        .find({
          appId,
          $or: [
            { isPublished: false, publicationDate: { $exists: true } },
            { isPublished: true, unpublicationDate: { $lte: new Date() } },
          ],
        })
        .count(),
      articlesColl
        .find({
          appId,
          isPublished: false,
          publicationDate: { $exists: false },
        })
        .count(),
    ]);

    return { publication: { published, unpublished, drafts } };
  } finally {
    client.close();
  }
};
