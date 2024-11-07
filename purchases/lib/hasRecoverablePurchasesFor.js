/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import {
  getRecoverablePurchasesForDevice,
  getRecoverablePurchasesForUser,
} from './getRecoverablePurchasesFor';

export const hasRecoverablePurchasesFor = async (
  appId,
  id,
  userId,
  { user }
) => {
  const client = await MongoClient.connect();

  try {
    const devicePurchases = await getRecoverablePurchasesForDevice(
      appId,
      id,
      userId
    );

    const counts = {
      transferable: 0,
      assignable: 0,
    };

    devicePurchases.forEach((purchase) => {
      if (!purchase.user) {
        if (purchase.userId) {
          counts.transferable += 1;
        } else {
          counts.assignable += 1;
        }
      }
    });

    if (user) {
      const userPurchases = await getRecoverablePurchasesForUser(
        appId,
        id,
        userId
      );

      counts.assignable += userPurchases.length;
    }

    return counts;
  } finally {
    client.close();
  }
};
