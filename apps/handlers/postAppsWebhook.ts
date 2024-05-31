/* eslint-disable import/no-relative-packages */
// import stripe from ('stripe')(
//   'sk_test_51LBJZKKD2Srbl7Iomp6ag5TPCImTUfKOJGxzb7MPFfgBhgaN36c0C9FHzAvUTj4kuWXRx2B5dhQamqFxKZNJAepW00vwksLCFx'
// );
import { APIGatewayProxyEvent } from 'aws-lambda';

import Stripe from 'stripe';

import response, {
  handleException,
  wrapperHandleException,
} from '../../libs/httpResponses/response';
import { getStripeClient } from '../../libs/stripe';

import { checkBodyIsPresent } from '../../libs/httpResponses/checks';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_STRIPE,
} from '../../libs/httpResponses/errorCodes';
import {
  getStripeSubscriptionMetadata,
  isStripeSubcriptionStatus,
} from '../lib/appsUtils';

const { COLL_APPS } = mongoCollections;

const STRIPE_WEBHOOK_SECRET =
  'whsec_f87467f40045df67affa6b33de01b7b1d8da6d41bc480facacbd3d8fcae7ec71';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const payload = checkBodyIsPresent(event.body);

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
                type: 'STRIPE_WEEKHOOK',
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

    if (stripeEvent.type === 'customer.subscription.created') {
      console.log('STRIPEEVENT.type', stripeEvent.type);
      console.log('stripeEvent', stripeEvent);

      const client = await MongoClient.connect();

      const db = client.db();
      const {
        metadata: { appId },
      } = stripeEvent.data.object;

      await db.collection(COLL_APPS).updateOne(
        { _id: appId },
        {
          $set: {
            stripeSubscriptionId: stripeEvent.data.object.id,
          },
        }
      );
    }

    if (stripeEvent.type === 'customer.subscription.updated') {
      console.log('STRIPEEVENT.type', stripeEvent.type);
      console.log('stripeEvent', stripeEvent);
      const { id: stripeSubscriptionId, metadata } = stripeEvent.data.object;

      const crowdaaStatus = metadata.crowdaaStatus;

      if (
        isStripeSubcriptionStatus(crowdaaStatus) ||
        crowdaaStatus === 'initial'
      ) {
        console.log('trigger suspense update => update metadata');
        const updatedSubscription = await stripe.subscriptions.update(
          stripeSubscriptionId,
          {
            metadata: {
              ...metadata,
              ...getStripeSubscriptionMetadata('hold'),
            },
            // Suspense the subscription
            pause_collection: {
              behavior: 'mark_uncollectible',
            },
          }
        );

        return response({
          code: 200,
          body: formatResponseBody({
            data: {
              message: 'Subscription updated',
              details: { updatedSubscription },
            },
          }),
        });
      }
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          message: 'Ok',
        },
      }),
    });
  } catch (exception) {
    // console.log('exception', exception);
    return handleException(exception);
  }
};
