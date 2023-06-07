import getDBCounter from '../../counters/lib/getDBCounter';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_ARTICLES, COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export const getArticleCommentsCount = async (appId, articleId) => {
  const counter = await getDBCounter(appId, 'pressArticle-comments', articleId, {
    collection: COLL_USER_GENERATED_CONTENTS,
    pipeline: [
      {
        $match: {
          appId,
          rootParentCollection: COLL_PRESS_ARTICLES,
          rootParentId: articleId,
          type: 'comment',
          trashed: false,
          $or: [
            { moderated: false, reviewed: true },
            { moderated: { $exists: false }, reviewed: { $exists: false } },
          ],
        },
      },
      {
        $count: 'total',
      },
    ],
    outputField: 'total',
  });

  return (counter);
};
