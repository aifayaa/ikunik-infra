import getLastPurchasesQueue from '../lib/getLastPurchasesQueue';

const { FID_APPS_ID } = process.env;

export default async () => {
  try {
    if (!FID_APPS_ID) return;

    const ret = await getLastPurchasesQueue(FID_APPS_ID);

    return ret;
  } catch (exception) {
    console.error(`Caught global error :`, exception);
  }
};
