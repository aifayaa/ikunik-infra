/* eslint-disable import/no-relative-packages */
import mongoCollections from './mongoCollections.json';

const { COLL_PRESS_ARTICLES_CACHE } = mongoCollections;

export async function invalidateArticlesCache(db, appIds, opts = {}) {
  const normalizedAppIds = [
    ...new Set([].concat(appIds || []).filter(Boolean)),
  ];

  if (!normalizedAppIds.length) {
    return { deletedCount: 0 };
  }

  const result = await db.collection(COLL_PRESS_ARTICLES_CACHE).deleteMany(
    {
      appId: { $in: normalizedAppIds },
      type: 'firstLoad',
    },
    opts
  );

  return { deletedCount: result.deletedCount || 0 };
}
