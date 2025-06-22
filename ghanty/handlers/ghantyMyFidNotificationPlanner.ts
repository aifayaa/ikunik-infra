import ghantyMyFidNotificationPlanner from '../lib/ghantyMyFidNotificationPlanner';

const { FID_APPS_ID } = process.env;

type LambdaParams = {
  lastExec?: {
    Payload?: {
      offset: number;
    };
  };
};

export default async (params: LambdaParams) => {
  try {
    if (!FID_APPS_ID) return;

    const offset = params?.lastExec?.Payload?.offset || 0;

    const ret = await ghantyMyFidNotificationPlanner(FID_APPS_ID, offset);

    return ret;
  } catch (exception) {
    console.error(`Caught global error :`, exception);
  }
};
