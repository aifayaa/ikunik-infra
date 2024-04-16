/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getRecoverablePurchasesFor } from './getRecoverablePurchasesFor';

const { COLL_CONTENT_PERMISSIONS } = mongoCollections;

export const recoverPurchasesFor = async (
  appId,
  deviceId,
  userId,
  { transfer = false, assign = false }
) => {
  const client = await MongoClient.connect();

  try {
    const purchases = await getRecoverablePurchasesFor(appId, deviceId, userId);

    const lists = {
      transferable: [],
      assignable: [],
    };
    purchases.forEach((purchase) => {
      if (!purchase.user) {
        if (purchase.userId) {
          lists.transferable.push(purchase._id);
        } else {
          lists.assignable.push(purchase._id);
        }
      }
    });

    // eslint-disable-next-line no-console
    console.log('DEBUG RUEUZOLT', purchases, lists);
    // deviceId = f62da105652d0e19;

    if (transfer && lists.transferable.length > 0) {
      await client
        .db()
        .collection(COLL_CONTENT_PERMISSIONS)
        .updateMany(
          { _id: { $in: lists.transferable } },
          { $set: { userId, transferedAt: new Date() } }
        );
    }

    if (assign && lists.assignable.length > 0) {
      await client
        .db()
        .collection(COLL_CONTENT_PERMISSIONS)
        .updateMany(
          { _id: { $in: lists.assignable } },
          { $set: { userId, assignedAt: new Date() } }
        );
    }

    return {
      transferable: transfer ? lists.transferable.length : 0,
      assignable: assign ? lists.assignable.length : 0,
    };
  } finally {
    client.close();
  }
};
