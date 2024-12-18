/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_ARTICLES, COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export const getArticleCommentsCount = async (appId, articleId) => {
  let client;
  try {
    client = await MongoClient.connect();
    const count = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .find({
        appId,
        rootParentCollection: COLL_PRESS_ARTICLES,
        rootParentId: articleId,
        type: 'comment',
        trashed: false,
        $or: [
          { moderated: false, reviewed: true },
          { moderated: { $exists: false }, reviewed: { $exists: false } },
        ],
      })
      .count();
    return count;
  } finally {
    await client.close();
  }
};
