/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_DRAFTS, COLL_PRESS_ARTICLES } = mongoCollections;

export const removeArticle = async (_userId, appId, articleId) => {
  const client = await MongoClient.connect();
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    await client.db().collection(COLL_PRESS_ARTICLES).deleteOne(
      {
        _id: articleId,
        appId,
      },
      opts
    );

    await client.db().collection(COLL_PRESS_DRAFTS).deleteMany(
      {
        articleId,
        appId,
      },
      opts
    );

    await session.commitTransaction();

    return { articleId };
  } finally {
    if (session) session.endSession();
    client.close();
  }
};
