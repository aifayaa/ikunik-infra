import { cronSubscriptionChecks } from '../lib/cronSubscriptionChecks';

export default async (event, context) => {
  try {
    await cronSubscriptionChecks(context);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Lambda: caught error', e, 'Event', event);
  }
};
