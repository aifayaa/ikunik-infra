/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { getRecoverablePurchasesFor } from './getRecoverablePurchasesFor';

export const hasRecoverablePurchasesFor = async (appId, deviceId, userId) => {
  const client = await MongoClient.connect();

  try {
    const purchases = await getRecoverablePurchasesFor(appId, deviceId, userId);

    const counts = {
      transferable: 0,
      assignable: 0,
    };

    purchases.forEach((purchase) => {
      if (!purchase.user) {
        if (purchase.userId) {
          counts.transferable += 1;
        } else {
          counts.assignable += 1;
        }
      }
    });

    return counts;
  } finally {
    client.close();
  }
};
