/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_NFT_COLLECTIONS, COLL_USER_BADGES } = mongoCollections;

export default async (appId, collectionId, badgeId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const nftCollection = await db.collection(COLL_NFT_COLLECTIONS).findOne({
      _id: collectionId,
      appId,
    });

    const userBadge = await db.collection(COLL_USER_BADGES).findOne({
      _id: badgeId,
      appId,
    });

    if (!nftCollection || !userBadge) {
      throw new Error('content_not_found');
    }

    await db.collection(COLL_USER_BADGES).updateOne(
      {
        _id: badgeId,
        appId,
      },
      {
        $set: {
          nftCollectionId: collectionId,
        },
      }
    );

    return { ok: true };
  } finally {
    client.close();
  }
};
