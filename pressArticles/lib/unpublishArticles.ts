/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../libs/mongoCollections.json';
import { cleanPendingArticleNotifications } from './notificationsQueue.js';

const { COLL_PRESS_ARTICLES, COLL_PRESS_DRAFTS } = mongoCollections;

export async function unpublishArticlesInDb(
  queryArticlesToUnpublish: Record<string, any>,
  {
    db,
    session,
    userId,
  }: {
    db: any;
    session: unknown;
    userId: string;
  }
) {
  await db.collection(COLL_PRESS_ARTICLES).updateMany(
    queryArticlesToUnpublish,
    {
      $set: {
        isPublished: false,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    },
    { session }
  );

  await db.collection(COLL_PRESS_DRAFTS).updateMany(
    queryArticlesToUnpublish,
    {
      $set: {
        isPublished: false,
      },
    },
    { session }
  );
}

export async function unpublishArticlesNotifications(
  queryArticlesToUnpublish: Record<string, any>,
  db: any
) {
  const unpublishedArticles = (await db
    .collection(COLL_PRESS_ARTICLES)
    .find(queryArticlesToUnpublish, { projection: { _id: 1 } })
    .toArray()) as Array<{ _id: string }>;

  const articleIds = unpublishedArticles.map(({ _id }) => _id);

  const promises = articleIds.map((articleId) =>
    cleanPendingArticleNotifications(articleId)
  );

  await Promise.all(promises);

  return { articleIds };
}
