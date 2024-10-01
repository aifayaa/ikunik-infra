/* eslint-disable import/no-relative-packages */
import userMetricsViewOnUserIdentify from '../lib/userMetricsViewOnUserIdentify';

type EventParametersType = {
  appId: string;
  userId: string;
  deviceId: string;
};

export default async (event: EventParametersType) => {
  try {
    await userMetricsViewOnUserIdentify(
      event.appId,
      event.userId,
      event.deviceId
    );
    return { ok: true };
  } catch (exception) {
    console.warn(
      'Uncaught exception during user metrics view rebuild',
      event.appId,
      exception
    );
    return { exception };
  }
};
