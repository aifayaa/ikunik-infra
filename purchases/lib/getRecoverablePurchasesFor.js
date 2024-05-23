/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CONTENT_PERMISSIONS, COLL_USERS } = mongoCollections;

export const getRecoverablePurchasesFor = async (appId, deviceId, userId) => {
  const query = {
    deviceId,
    userId: { $ne: userId },
  };

  const client = await MongoClient.connect();

  try {
    /*
     * This collection does not contain an appId so we need a two step check
     * to ensure that it's set properly.
     * We should never see two different appIds in there since the deviceId is
     * meant to be unique, but better be safe than sorry.
     */
    const rawPurchases = await client
      .db()
      .collection(COLL_CONTENT_PERMISSIONS)
      .aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: COLL_USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray();

    const purchasesContentHash = {};
    rawPurchases.forEach((purchase) => {
      const { contentCollection, contentId } = purchase;
      if (!purchasesContentHash[contentCollection]) {
        purchasesContentHash[contentCollection] = {};
      }
      purchasesContentHash[contentCollection][contentId] = purchase;
    });

    const purchasesCollections = Object.keys(purchasesContentHash);

    const appPurchases = [];
    const promises = purchasesCollections.map(async (collection) => {
      const items = await client
        .db()
        .collection(collection)
        .find(
          {
            _id: { $in: Object.keys(purchasesContentHash[collection]) },
            appId,
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      const ids = items.map(({ _id }) => _id);
      ids.forEach((id) => {
        const purchase = purchasesContentHash[collection][id];
        if (purchase) {
          appPurchases.push(purchase);
        }
      });
    });

    await Promise.all(promises);

    return appPurchases;
  } finally {
    client.close();
  }
};
