import { APIGatewayProxyEvent } from 'aws-lambda';
import Stripe from 'stripe';

import response, {
  handleException,
  wrapperHandleException,
} from '@libs/httpResponses/response';
import { getStripeClient } from '@libs/stripe';
import { checkBodyIsPresent } from '@libs/httpResponses/checks';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import MongoClient from '@libs/mongoClient.js';
import mongoCollections from '@libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_STRIPE,
} from '@libs/httpResponses/errorCodes';
import {
  getStripeSubscriptionMetadata,
  isStripeSubcriptionStatus,
} from '@apps/lib/appsUtils';

const { COLL_APPS } = mongoCollections;

const STRIPE_WEBHOOK_SECRET = Boolean(process.env.IS_OFFLINE)
  // webhook secret created by the stripe cli when locally listening for events
  ? 'whsec_f87467f40045df67affa6b33de01b7b1d8da6d41bc480facacbd3d8fcae7ec71'
  : String(process.env.STRIPE_WEBHOOK_SECRET_KEY);

export default async (event: APIGatewayProxyEvent) => {
  try {
    const payload = checkBodyIsPresent(event.body);

    /*
      TODO check request originates from allowed domains and ip https://docs.stripe.com/ips
      is it possible to filter ip addresses in the API gateway configuration ?
    */

    const stripe = getStripeClient();

    let stripeEvent: Stripe.Event | undefined;

    try {
      const sig = event.headers['Stripe-Signature'] as string;
      stripeEvent = await stripe.webhooks.constructEventAsync(
        payload,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (exception) {
      wrapperHandleException(exception, (exception) => {
        return response({
          code: 400,
          body: formatResponseBody({
            errors: [
              {
                type: 'STRIPE_WEBHOOK',
                code: '400',
                message: `Webhook Error: ${exception.message}`,
                details: exception.stack,
              },
            ],
          }),
        });
      });
    }

    if (!stripeEvent) {
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
        `The Stripe event is not defined`
      );
    }
    /* 
      TODO: 
      - should we check stripeEvent.livemode ? https://docs.stripe.com/webhooks#live-and-test-mode
      - save every stripe event that were handled? we might receive the same event multiple times,
      by doing so, we can check every time and ensure that each event is handled only once.
      - check if operations (db access, computing, etc) we apply takes too long and might cause
      stripe to consider ?
    */
    if (stripeEvent.type === 'customer.subscription.created') {
      // TODO use appropriate logger
      console.log('Received event customer.subscription.created', stripeEvent);
      const client = await MongoClient.connect();
      const subscription = stripeEvent.data.object;

      const { metadata } = subscription;

      const { appId, crowdaaStatus } = metadata;

      const stripeSubscriptionId = subscription.id;

      const db = client.db();
      const { matchedCount } = await db.collection(COLL_APPS).updateOne(
        { _id: appId },
        {
          $set: {
            'stripe.subscriptionId': subscription.id,
          },
        }
      );

      if (
        matchedCount === 1 && // make sure the app still exist
        isStripeSubcriptionStatus(crowdaaStatus) &&
        crowdaaStatus === 'initial'
      ) {
        const updatedSubscription = await stripe.subscriptions.update(
          stripeSubscriptionId,
          {
            metadata: {
              ...metadata,
              ...getStripeSubscriptionMetadata('hold'),
            },
            // Suspend the subscription
            pause_collection: {
              behavior: 'void',
            },
          }
        );
        // TODO use appropriate logger
        console.log('Paused subscription payment collection', {
          appId,
          updatedSubscription,
        });

        return response({
          code: 200,
          // body does not seem necessary for the webhook response
          body: formatResponseBody({
            data: {
              message: 'Subscription updated',
              details: { updatedSubscription },
            },
          }),
        });
      } else {
        // TODO check if we need to throw an error to make stripe send the event again
        // TODO use appropriate logger
        console.warn('Could not pause subscription payment collection', {
          appId,
          matchedCount,
          subscription,
        });
      }
    } else if (stripeEvent.type === 'customer.subscription.updated') {
      // NOTE subscription updated event is fired when payment collection is "paused/resumed"

      // TODO use appropriate logger
      console.log('Received event customer.subscription.updated', stripeEvent);

      // TODO check subscription payment collection has been resumed or paused
      // and remove/grant access to the associated app?
    }
    
    // TODO handle payment failure

    return response({
      code: 200,
      // body does not seem necessary for the webhook response
      body: formatResponseBody({
        data: {
          message: 'Ok',
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
