/* eslint-disable import/no-relative-packages */
import rebuildUserMetricsView from 'asyncLambdas/lib/rebuildUserMetricsView';

type EventParametersType = {
  appId: string;
};

export default async (event: EventParametersType) => {
  try {
    await rebuildUserMetricsView(event.appId);
  } catch (exception) {
    console.warn('Uncaught exception during email', event, exception);
  }
};
