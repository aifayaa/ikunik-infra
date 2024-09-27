/* eslint-disable import/no-relative-packages */
import rebuildUserMetricsView from 'asyncLambdas/lib/rebuildUserMetricsView';

type EventParametersType = {
  appId: string;
};

export default async (event: EventParametersType) => {
  try {
    await rebuildUserMetricsView(event.appId);
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
