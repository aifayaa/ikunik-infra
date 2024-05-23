/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  /* Do not delete content from COLL_CONTENT_PERMISSIONS.
   * It can now be recovered from the same deviceId
   * (feature request from apple, @20240415)
   */
  // COLL_CONTENT_PERMISSIONS,

  COLL_DELETED_ELEMENTS,

  COLL_BLAST_NOTIFICATIONS_QUEUE,
  // +> endpointId(COLL_PUSH_NOTIFICATIONS) => userId
  // => userId
  COLL_DOCUMENTS,
  // => fromUserId
  COLL_PICTURES,
  // => fromUserId
  COLL_PURCHASES,
  // => userId
  COLL_PUSH_NOTIFICATIONS,
  // => userId +> EndpointArn
  COLL_USERS,
  // => _id
  COLL_USER_BALANCES,
  // => userId
  COLL_USER_GENERATED_CONTENTS,
  // => userId
  COLL_USER_GENERATED_CONTENTS_REPORTS,
  // +> ugcId(COLL_USER_GENERATED_CONTENTS) => userId
  COLL_USER_GENERATED_CONTENTS_USER_REPORTS,
  // => reportedUserId => userId +> ugcId(COLL_USER_GENERATED_CONTENTS)
  COLL_USER_METRICS,
  // => userId +> contentId+contentCollection
  COLL_VIDEOS,
  // => fromUserId
} = mongoCollections;

async function deleteWhere(db, coll, where, deletedMeta) {
  const toDeleteData = await db.collection(coll).find(where).toArray();
  if (toDeleteData.length > 0) {
    const insData = toDeleteData.map((item) => ({
      ...deletedMeta,
      collection: coll,
      data: item,
    }));
    await db.collection(COLL_DELETED_ELEMENTS).insertMany(insData);
    await db.collection(coll).deleteMany(where);
  }

  return toDeleteData;
}

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db();
  const deletedMeta = {
    appId,
    for: { userId },
    batchRef: new ObjectID().toString(),
    deletedAt: new Date(),
  };

  try {
    await deleteWhere(db, COLL_PURCHASES, { appId, userId }, deletedMeta);
    // await deleteWhere(
    //   db,
    //   COLL_CONTENT_PERMISSIONS,
    //   { appId, userId },
    //   deletedMeta
    // );
    await deleteWhere(db, COLL_USER_BALANCES, { appId, userId }, deletedMeta);
    const ugcs = await deleteWhere(
      db,
      COLL_USER_GENERATED_CONTENTS,
      { appId, userId },
      deletedMeta
    );
    const ugcIds = ugcs.map(({ _id }) => _id);

    await deleteWhere(
      db,
      COLL_USER_GENERATED_CONTENTS_REPORTS,
      { appId, userId },
      deletedMeta
    );

    if (ugcIds.length > 0) {
      await deleteWhere(
        db,
        COLL_USER_GENERATED_CONTENTS_REPORTS,
        { appId, ugcId: { $in: ugcIds } },
        deletedMeta
      );
    }

    await deleteWhere(
      db,
      COLL_USER_GENERATED_CONTENTS_USER_REPORTS,
      { appId, $or: [{ userId }, { reportedUserId: userId }] },
      deletedMeta
    );

    if (ugcIds.length > 0) {
      await deleteWhere(
        db,
        COLL_USER_GENERATED_CONTENTS_USER_REPORTS,
        { appId, ugcId: { $in: ugcIds } },
        deletedMeta
      );
    }

    await deleteWhere(db, COLL_USER_METRICS, { appId, userId }, deletedMeta);

    if (ugcIds.length > 0) {
      await deleteWhere(
        db,
        COLL_USER_METRICS,
        {
          appId,
          contentId: { $in: ugcIds },
          contentCollection: COLL_USER_GENERATED_CONTENTS,
        },
        deletedMeta
      );
    }

    await deleteWhere(
      db,
      COLL_VIDEOS,
      { appId, fromUserId: userId },
      deletedMeta
    );
    await deleteWhere(
      db,
      COLL_PICTURES,
      { appId, fromUserId: userId },
      deletedMeta
    );
    await deleteWhere(
      db,
      COLL_DOCUMENTS,
      { appId, fromUserId: userId },
      deletedMeta
    );

    await db.collection(COLL_BLAST_NOTIFICATIONS_QUEUE).updateMany(
      {
        appId,
        userId,
      },
      {
        $set: { userId: null },
      }
    );
    await db.collection(COLL_PUSH_NOTIFICATIONS).updateMany(
      {
        appId,
        userId,
      },
      {
        $set: { userId: null },
      }
    );

    await deleteWhere(db, COLL_USERS, { appId, _id: userId }, deletedMeta);

    return deletedMeta;
  } finally {
    client.close();
  }
};
