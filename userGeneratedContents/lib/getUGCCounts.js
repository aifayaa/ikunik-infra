/* eslint-disable import/no-relative-packages */
import getDBCounter from '../../counters/lib/getDBCounter';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export const getUGCArticleCommentsCount = async (appId, ugcId) => {
  const counter = await getDBCounter(
    appId,
    'userGeneratedContent-article-comments',
    ugcId,
    {
      collection: COLL_USER_GENERATED_CONTENTS,
      pipeline: [
        {
          $match: {
            appId,
            rootParentCollection: COLL_USER_GENERATED_CONTENTS,
            rootParentId: ugcId,
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
    }
  );

  return counter;
};

export const getUGCCommentsCount = async (appId, ugcId) => {
  const counter = await getDBCounter(
    appId,
    'userGeneratedContent-comments',
    ugcId,
    {
      collection: COLL_USER_GENERATED_CONTENTS,
      pipeline: [
        {
          $match: {
            appId,
            parentCollection: COLL_USER_GENERATED_CONTENTS,
            parentId: ugcId,
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
    }
  );

  return counter;
};
