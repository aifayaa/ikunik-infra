/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  getRecoverablePurchasesForDevice,
  getRecoverablePurchasesForUser,
} from './getRecoverablePurchasesFor';

const { COLL_CONTENT_PERMISSIONS } = mongoCollections;

export const recoverPurchasesFor = async (
  appId,
  id,
  userId,
  { transfer = false, assign = false, user = false }
) => {
  const client = await MongoClient.connect();

  try {
    const purchases = await getRecoverablePurchasesForDevice(appId, id, userId);

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

    if (user) {
      const userPurchases = await getRecoverablePurchasesForUser(
        appId,
        id,
        userId
      );
      userPurchases.forEach((purchase) => {
        lists.assignable.push(purchase._id);
      });
    }

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

    /* Filtering duplicates (items bought multiple times with different deviceId / userId that were now merged */
    const allEntriesCursor = await client
      .db()
      .collection(COLL_CONTENT_PERMISSIONS)
      .find({ userId });

    const dupEntriesHash = {};
    await allEntriesCursor.forEach((entry) => {
      const keyArray = [
        entry.contentId,
        entry.contentCollection,
        entry.expiresAt,
      ];
      if (entry.permissions) {
        keyArray.push(entry.permissions.all);
        keyArray.push(entry.permissions.read);
        keyArray.push(entry.permissions.write);
      }
      const keyStr = JSON.stringify(keyArray);

      if (dupEntriesHash[keyStr]) {
        dupEntriesHash[keyStr].push({
          _id: entry._id,
          createdAt: entry.createdAt,
        });
      } else {
        dupEntriesHash[keyStr] = [
          {
            _id: entry._id,
            createdAt: entry.createdAt,
          },
        ];
      }
    });

    const duplicated = Object.values(dupEntriesHash).filter(
      (list) => list.length > 1
    );

    const toDeleteIds = [];
    duplicated.forEach((list) => {
      const sorted = list.sort(
        (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
      );
      sorted.pop();
      sorted.forEach(({ _id }) => {
        toDeleteIds.push(_id);
      });
    });

    if (toDeleteIds.length > 0) {
      await client
        .db()
        .collection(COLL_CONTENT_PERMISSIONS)
        .deleteMany({ _id: { $in: toDeleteIds }, userId });
    }

    return {
      transferable: transfer ? lists.transferable.length : 0,
      assignable: assign ? lists.assignable.length : 0,
    };
  } finally {
    client.close();
  }
};
