import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_STRIPE,
  STRIPE_SUBSCRIPTION_STATUS_NOT_ALLOWED_CODE,
  STRIPE_SUBSCRIPTION_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

import { getMeterEventName, getStripeClient } from '@libs/stripe';
import { getNbActiveUsersForDay } from '@userMetrics/lib/getMAU.js';
import Stripe from 'stripe';
import { isStripeSubcriptionStatus } from './appsUtils';

type Params = {
  appId: string;
  subscriptionId?: string;
  day: Date;
  db: any; // TODO type
};

/**
 * @param day - should be restricted as stated in https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage#event-timestamps
 */
export const putComputeActiveUsersForDay = async ({
  appId,
  subscriptionId,
  day,
  db,
}: Params): Promise<number | null> => {
  const stripe = getStripeClient();
  let subscription: Stripe.Subscription | undefined;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } else {
    // we should always have one subscription per app
    const searchRes = await stripe.subscriptions.search({
      query: `metadata['appId']:'${appId}'`,
    });
    subscription = searchRes.data[0];
  }

  if (!subscription) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      STRIPE_SUBSCRIPTION_NOT_FOUND_CODE,
      `Cannot find Stripe subscription for application '${appId}'`
    );
  }

  if (
    subscription.status === 'canceled' ||
    !subscription.metadata?.crowdaaStatus ||
    (isStripeSubcriptionStatus(subscription.metadata?.crowdaaStatus) &&
      subscription.metadata?.crowdaaStatus !== 'active')
  ) {
    throw new CrowdaaError(
      ERROR_TYPE_STRIPE,
      STRIPE_SUBSCRIPTION_STATUS_NOT_ALLOWED_CODE,
      'The subscription status is not in an allowed state to be processed',
      {
        details: {
          appId,
          status: subscription.status,
          crowdaaStatus: subscription.metadata.crowdaaStatus,
        },
      }
    );
  }

  const fromStartingDay = new Date(subscription.current_period_start * 1000);
  // TODO use appropriate logger
  console.log('Computing active users', {
    appId,
    subscriptionId: subscription.id,
    day,
    fromStartingDay,
  });

  const activeUsersCount = await getNbActiveUsersForDay({
    db,
    appId,
    fromStartingDay,
    day,
  });

  // for now, it is unnecessary to notify stripe if no active users are found
  if (activeUsersCount > 0) {
    // TODO: check if we need to skip meter event creation for other subscription statuses

    // TODO watch out for stripe api rate limits https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage#rate-limits
    const meterEvent = await stripe.billing.meterEvents.create({
      event_name: getMeterEventName(appId),
      payload: {
        value: String(activeUsersCount),
        stripe_customer_id: subscription.customer as string,
      },
      // day should be restricted as stated in https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage#event-timestamps
      timestamp: Math.floor(day.getTime() / 1000),
    });
    // TODO use appropriate logger
    console.log('Stripe meter event created', {
      appId,
      day,
      meterEvent,
    });
  } else {
    // TODO use appropriate logger
    console.log('Skipped stripe meter event creation (no active user)', {
      appId,
      day,
    });
  }

  return activeUsersCount;
};
