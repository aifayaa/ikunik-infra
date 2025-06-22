import ghantyMyFidNotificationsTrigger from '../lib/ghantyMyFidNotificationsTrigger';

const { FID_APPS_ID } = process.env;

export default async () => {
  try {
    if (!FID_APPS_ID) return;

    await ghantyMyFidNotificationsTrigger();
  } catch (exception) {
    console.error(`Caught global error :`, exception);
  }
};
