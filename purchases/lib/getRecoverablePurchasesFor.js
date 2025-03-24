/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_CONTENT_PERMISSIONS,
  COLL_PURCHASES,
  COLL_USERS,
  COLL_USER_METRICS,
  COLL_PUSH_NOTIFICATIONS,
} = mongoCollections;

export const getRecoverablePurchasesForDevice = async (
  appId,
  deviceId,
  userId
) => {
  const client = await MongoClient.connect();

  try {
    const rawPurchases = await client
      .db()
      .collection(COLL_PURCHASES)
      .aggregate([
        {
          $match: {
            appId,
            deviceId,
            userId: { $ne: userId },
          },
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

    const recoverablePurchases = rawPurchases.filter(
      (purchase) => !purchase.user
    );
    return recoverablePurchases;
  } finally {
    client.close();
  }
};

export const getRecoverablePurchasesForUser = async (
  appId,
  deviceId,
  userId
) => {
  const client = await MongoClient.connect();

  try {
    const allUserDevices = [];

    const notificationDevices = await client
      .db()
      .collection(COLL_PUSH_NOTIFICATIONS)
      .find(
        { appId, userId, deviceUUID: { $ne: deviceId } },
        { projection: { deviceUUID: 1 } }
      )
      .toArray();

    notificationDevices.forEach((notif) => {
      if (allUserDevices.indexOf(notif.deviceUUID) < 0) {
        allUserDevices.push(notif.deviceUUID);
      }
    });

    const userMetricsDevices = await client
      .db()
      .collection(COLL_USER_METRICS)
      .find(
        { appId, userId, deviceId: { $nin: allUserDevices } },
        { projection: { deviceId: 1 } }
      )
      .toArray();

    userMetricsDevices.forEach((metric) => {
      if (allUserDevices.indexOf(metric.deviceId) < 0) {
        allUserDevices.push(metric.deviceId);
      }
    });

    const rawPurchases = await client
      .db()
      .collection(COLL_PURCHASES)
      .aggregate([
        {
          $match: {
            appId,
            deviceId: { $in: allUserDevices },
            userId: { $ne: userId },
          },
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

    const recoverablePurchases = rawPurchases.filter(
      (purchase) => !purchase.user
    );
    return recoverablePurchases;
  } finally {
    client.close();
  }
};

export const getRecoverablePermissionsForDevice = async (
  appId,
  deviceId,
  userId
) => {
  const client = await MongoClient.connect();

  try {
    /*
     * This collection does not contain an appId so we need a two step check
     * to ensure that it's set properly.
     * We should never see two different appIds in there since the deviceId is
     * meant to be unique, but better be safe than sorry.
     */
    const rawPermissions = await client
      .db()
      .collection(COLL_CONTENT_PERMISSIONS)
      .aggregate([
        {
          $match: {
            deviceId,
            userId: { $ne: userId },
          },
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

    const permissionsContentHash = {};
    rawPermissions.forEach((permission) => {
      const { contentCollection, contentId } = permission;
      if (!permissionsContentHash[contentCollection]) {
        permissionsContentHash[contentCollection] = {};
      }
      permissionsContentHash[contentCollection][contentId] = permission;
    });

    const permissionCollections = Object.keys(permissionsContentHash);

    const appPermissions = [];
    const promises = permissionCollections.map(async (collection) => {
      const items = await client
        .db()
        .collection(collection)
        .find(
          {
            _id: { $in: Object.keys(permissionsContentHash[collection]) },
            appId,
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      const ids = items.map(({ _id }) => _id);
      ids.forEach((id) => {
        const permission = permissionsContentHash[collection][id];
        if (permission) {
          appPermissions.push(permission);
        }
      });
    });

    await Promise.all(promises);

    return appPermissions;
  } finally {
    client.close();
  }
};

export const getRecoverablePermissionsForUser = async (
  appId,
  deviceId,
  userId
) => {
  const client = await MongoClient.connect();

  try {
    const allUserDevices = [deviceId];

    const notificationDevices = await client
      .db()
      .collection(COLL_PUSH_NOTIFICATIONS)
      .find(
        { appId, userId, deviceUUID: { $ne: deviceId } },
        { projection: { deviceUUID: 1 } }
      )
      .toArray();

    notificationDevices.forEach((notif) => {
      if (allUserDevices.indexOf(notif.deviceUUID) < 0) {
        allUserDevices.push(notif.deviceUUID);
      }
    });

    const userMetricsDevices = await client
      .db()
      .collection(COLL_USER_METRICS)
      .find(
        { appId, userId, deviceId: { $nin: allUserDevices } },
        { projection: { deviceId: 1 } }
      )
      .toArray();

    userMetricsDevices.forEach((metric) => {
      if (allUserDevices.indexOf(metric.deviceId) < 0) {
        allUserDevices.push(metric.deviceId);
      }
    });

    /*
     * This collection does not contain an appId so we need a two step check
     * to ensure that it's set properly.
     * We should never see two different appIds in there since the deviceId is
     * meant to be unique, but better be safe than sorry.
     */
    const rawDevicesPermissions = await client
      .db()
      .collection(COLL_CONTENT_PERMISSIONS)
      .aggregate([
        {
          $match: {
            deviceId: { $in: allUserDevices },
            userId: { $ne: userId },
          },
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

    const permissionsContentHash = {};
    rawDevicesPermissions.forEach((permission) => {
      if (permission.user) return;

      const { contentCollection, contentId } = permission;
      if (!permissionsContentHash[contentCollection]) {
        permissionsContentHash[contentCollection] = {};
      }
      permissionsContentHash[contentCollection][contentId] = permission;
    });

    const permissionCollections = Object.keys(permissionsContentHash);

    const devicesPermissions = [];
    const promises = permissionCollections.map(async (collection) => {
      const items = await client
        .db()
        .collection(collection)
        .find(
          {
            _id: { $in: Object.keys(permissionsContentHash[collection]) },
            appId,
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      const ids = items.map(({ _id }) => _id);
      ids.forEach((id) => {
        const permission = permissionsContentHash[collection][id];
        if (permission) {
          devicesPermissions.push(permission);
        }
      });
    });

    await Promise.all(promises);

    return devicesPermissions;
  } finally {
    client.close();
  }
};
