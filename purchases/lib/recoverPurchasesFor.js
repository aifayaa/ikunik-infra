/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  getRecoverablePermissionsForDevice,
  getRecoverablePermissionsForUser,
  getRecoverablePurchasesForDevice,
  getRecoverablePurchasesForUser,
} from './getRecoverablePurchasesFor';

const {
  COLL_CONTENT_PERMISSIONS,
  COLL_PURCHASES,
  COLL_USER_BADGES,
  COLL_USERS,
} = mongoCollections;

async function transferBadgesTo(userId, badgesIds, { client }) {
  const user = await client
    .db()
    .collection(COLL_USERS)
    .findOne({ _id: userId });

  if (!user) return;

  const userBadgesIds = (user.badges || [])
    .filter(
      ({ status = 'assigned' }) =>
        status === 'validated' || status === 'assigned'
    )
    .map(({ id }) => id);

  const toAdd = badgesIds
    .filter((id) => userBadgesIds.indexOf(id) < 0)
    .map((id) => ({
      id,
      status: 'assigned',
    }));

  if (toAdd.length > 0) {
    await client
      .db()
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId },
        {
          $addToSet: {
            badges: { $each: toAdd },
          },
        }
      );
  }
}

export const recoverPurchasesFor = async (
  appId,
  deviceId,
  userId,
  { transfer = false, assign = false, user = false }
) => {
  const client = await MongoClient.connect();

  try {
    const permissions = await getRecoverablePermissionsForDevice(
      appId,
      deviceId,
      userId
    );

    const toAddBadges = [];
    const permsList = {
      transferable: [],
      assignable: [],
    };
    const purchasesList = {
      transferable: [],
      assignable: [],
    };

    permissions.forEach((permission) => {
      if (!permission.user) {
        if (permission.userId) {
          permsList.transferable.push(permission._id);
        } else {
          permsList.assignable.push(permission._id);
        }

        if (permission.contentCollection === COLL_USER_BADGES) {
          toAddBadges.push(permission.contentId);
        }
      }
    });

    const purchases = await getRecoverablePurchasesForDevice(
      appId,
      deviceId,
      userId
    );

    purchases.forEach((purchase) => {
      if (!purchase.userId) {
        purchasesList.assignable.push(purchase._id);
      } else {
        purchasesList.transferable.push(purchase._id);
      }
    });

    if (user) {
      const userPermissions = await getRecoverablePermissionsForUser(
        appId,
        deviceId,
        userId
      );

      userPermissions.forEach((permission) => {
        permsList.assignable.push(permission._id);

        if (permission.contentCollection === COLL_USER_BADGES) {
          toAddBadges.push(permission.contentId);
        }
      });

      const userPurchases = await getRecoverablePurchasesForUser(
        appId,
        deviceId,
        userId
      );

      userPurchases.forEach((purchase) => {
        purchasesList.assignable.push(purchase._id);
      });
    }

    if (transfer) {
      if (permsList.transferable.length > 0) {
        await client
          .db()
          .collection(COLL_CONTENT_PERMISSIONS)
          .updateMany(
            { _id: { $in: permsList.transferable } },
            { $set: { userId, transferedAt: new Date() } }
          );
      }

      if (purchasesList.transferable.length > 0) {
        await client
          .db()
          .collection(COLL_PURCHASES)
          .updateMany(
            { _id: { $in: purchasesList.transferable } },
            { $set: { userId, transferedAt: new Date() } }
          );
      }
    }

    if (assign) {
      if (permsList.assignable.length > 0) {
        await client
          .db()
          .collection(COLL_CONTENT_PERMISSIONS)
          .updateMany(
            { _id: { $in: permsList.assignable } },
            { $set: { userId, assignedAt: new Date() } }
          );
      }

      if (purchasesList.assignable.length > 0) {
        await client
          .db()
          .collection(COLL_PURCHASES)
          .updateMany(
            { _id: { $in: purchasesList.assignable } },
            { $set: { userId, transferedAt: new Date() } }
          );
      }
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

    if (toAddBadges.length > 0) {
      await transferBadgesTo(userId, toAddBadges, { client });
    }

    return {
      transferable: transfer ? permsList.transferable.length : 0,
      assignable: assign ? permsList.assignable.length : 0,
    };
  } finally {
    client.close();
  }
};
