/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import {
  getRecoverablePermissionsForDevice,
  getRecoverablePermissionsForUser,
  getRecoverablePurchasesForDevice,
  getRecoverablePurchasesForUser,
} from './getRecoverablePurchasesFor';

export const hasRecoverablePurchasesFor = async (
  appId,
  deviceId,
  userId,
  { user }
) => {
  const client = await MongoClient.connect();

  try {
    const devicePermissions = await getRecoverablePermissionsForDevice(
      appId,
      deviceId,
      userId
    );

    const counts = {
      transferable: 0,
      assignable: 0,
    };

    devicePermissions.forEach((purchase) => {
      if (!purchase.user) {
        if (purchase.userId) {
          counts.transferable += 1;
        } else {
          counts.assignable += 1;
        }
      }
    });

    const devicePurchases = await getRecoverablePurchasesForDevice(
      appId,
      deviceId,
      userId
    );

    devicePurchases.forEach((purchase) => {
      if (!purchase.userId) {
        counts.assignable += 1;
      } else {
        counts.transferable += 1;
      }
    });

    if (user) {
      const userPermissions = await getRecoverablePermissionsForUser(
        appId,
        deviceId,
        userId
      );

      counts.assignable += userPermissions.length;

      const userPurchases = await getRecoverablePurchasesForUser(
        appId,
        deviceId,
        userId
      );

      counts.assignable += userPurchases.length;
    }

    return counts;
  } finally {
    client.close();
  }
};
